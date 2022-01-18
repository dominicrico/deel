const express = require('express')
const bodyParser = require('body-parser')
const { Op } = require("sequelize")
const { sequelize } = require('./model')
const { getProfile } = require('./middleware/getProfile')

const app = express()

app.use(bodyParser.json())
app.set('sequelize', sequelize)
app.set('models', sequelize.models)

/**
 * Returns contract with id if profile is part of contract
 * @returns contract by id
 */
app.get('/contracts/:id', getProfile, async (req, res) =>{
    const { Contract } = req.app.get('models')
    const { id } = req.params

    if (!id || id == 0) return res.status(400).end()

    try {
        const contract = await Contract.findOne({where: {id}})
    
        if (!contract) return res.status(404).end()
    
        if (contract.ClientId !== req.profile.id && contract.ContractorId !== req.profile.id) return res.status(403).end()
        
        return res.json(contract)
    } catch(e) { return res.status(500).json(err) }
})

/**
 * Returns all contracts for the current profile
 * @returns contracts by authenticated id
 */
 app.get('/contracts', getProfile, async (req, res) =>{
    const { Contract } = req.app.get('models')
    const { id } = req.profile

    if (!id || id == 0) return res.status(400).end()

    try {
        const contracts = await Contract.findAll({where: {
            [Op.not]: [
                { status: 'terminated' }
            ],
            [Op.or]: [
                { ContractorId: id },
                { ClientId: id }
            ],
        }})
        
        if (!contracts || !contracts.length) return res.status(404).end()
        
        return res.json(contracts)
    } catch(e) { return res.status(500).json(err) }
})

/**
 * Returns all unpaid jobs for the current profile
 * @returns jobs by authenticated id
 */
 app.get('/jobs/unpaid', getProfile, async (req, res) =>{
    const { Contract, Job } = req.app.get('models')
    const { id } = req.profile

    if (!id || id == 0) return res.status(400).end()

    try {
        const jobs = await Job.findAll({
            where: {
                paymentDate: null,
            },
            include: [{
                model: Contract,
                as: 'Contract',
                where: {
                    [Op.not]: [
                        { status: 'terminated' }
                    ],
                    [Op.or]: [
                        { ContractorId: id },
                        { ClientId: id }
                    ],
                }
            }]
        })
        
        if (!jobs ||!jobs.length) return res.status(404).end()
        
        return res.json(jobs)
    } catch(e) { return res.status(500).json(err) }
})

/**
 * Pays a job with given id if balance is >= amount
 * @returns null
 */
 app.post('/jobs/:job_id/pay', getProfile, async (req, res) =>{
    const { Job, Contract, Profile } = req.app.get('models')
    const { job_id } = req.params
    const { id } = req.profile

    if (!id) return res.status(400).end()
    if (!job_id) return res.status(400).end()

    try {
        const profile = await Profile.findOne({where: { id }})
        const job = await Job.findOne({
            where: {
                [Op.and]: [
                    { id: job_id }
                ]
            },
            include: [{
                model: Contract,
                as: 'Contract',
                where: { 
                    ClientId: id
                }
            }]
        })
        const contractor = await Profile.findOne({where: { id: job.Contract.ContractorId }})

        if (!job) return res.status(404).end()
        
        if (job.paid) return res.status(204).end()
        if (profile.balance < job.price) return res.status(403).end()

        contractor.balance = contractor.balance + job.price

        profile.balance = profile.balance - job.price
        
        job.paid = true
        job.paymentDate = new Date()

        await Promise.all([profile.save(), contractor.save(), job.save()])

        return res.status(200).end()
    } catch(e) { return res.status(500).json(err) }
})

/**
 * Deposit to balance of authenticated profile
 * @returns null
 */
 app.post('/balances/deposit/:userId', async (req, res) =>{
    const { Job, Contract, Profile } = req.app.get('models')
    const { userId } = req.params
    const { amount } = req.body

    if (!amount || typeof amount !== 'number' || amount === 0) return res.status(400).end()

    try {
        const profile = await Profile.findOne({where: { id: userId }})

        if (!profile) return res.status(404).end()

        const job = await Job.findAll({
            where: {
                paid: null
            },
            include: [{
                model: Contract,
                as: 'Contract',
                where: { 
                    ClientId: userId
                }
            }],
            attributes: ['price'], 
        })

        let fullAmountToPay = 0
        job.map(j => { fullAmountToPay += j.price })

        if (amount > (fullAmountToPay * .25)) return res.status(403).end()

        profile.balance = profile.balance + amount
        await profile.save()

        return res.status(204).end()
    } catch(e) { return res.status(500).json(err) }
})

module.exports = app
