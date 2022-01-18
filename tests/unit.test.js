const request = require('supertest')
const expect = require('chai').expect
const app = require('../src/app')

describe('deel server', () => {
  describe('policy', () => {
    it('should return 401 if profile_id header is missing', done => {
      request(app)
        .get('/contracts/1')
        .expect(401, (err, res) => {
            if(err) return done(err)
  
            expect(res.body).to.eql({})
            expect(res.status).to.equal(401)
  
            return done()
        })
    })
  })

  describe('contracts', () => {
    it('should return contract if belongs to profile', done => {
      const profileId = 1
  
      request(app)
        .get('/contracts/1')
        .set('profile_id', profileId)
        .expect(200, (err, res) => {
            if(err) return done(err)
  
            const { ContractorId, ClientId } = res.body
  
            const isPartOfContract = !(ClientId !== profileId && ContractorId !== profileId)
  
            expect(isPartOfContract).to.equal(true)
            expect(res.body.ClientId).to.equal(profileId)
  
            return done()
        })
    })
  
    it('should return 403 if contract not belongs to profile', done => {
      const profileId = 2
  
      request(app)
        .get('/contracts/1')
        .set('profile_id', profileId)
        .expect(403, (err, res) => {
            if(err) return done(err)
  
            const { ContractorId, ClientId } = res.body
  
            const isPartOfContract = !(ClientId !== profileId && ContractorId !== profileId)
  
            expect(isPartOfContract).to.equal(false)
            expect(res.body).to.eql({})
  
            return done()
        })
    })
  
    it('should return all contracts belongs to profile', done => {
      const profileId = 1
  
      request(app)
        .get('/contracts')
        .set('profile_id', profileId)
        .expect(200, (err, res) => {
            if(err) return done(err)
  
            expect(res.body.length).to.equal(1)
  
            return done()
        })
    })

    it('should return 404 if no contracts are found from id', done => {
      const profileId = 1
  
      request(app)
        .get('/contracts/666')
        .set('profile_id', profileId)
        .expect(404, (err, res) => {
            if(err) return done(err)
  
            return done()
        })
    })

    it('should return 404 if no contracts are found from profile_id', done => {
      const profileId = 9
  
      request(app)
        .get('/contracts')
        .set('profile_id', profileId)
        .expect(404, (err, res) => {
            if(err) return done(err)
  
            return done()
        })
    })
  })

  describe('jobs', () => {
    const profileId = 1

    it('should list all unpaid jobs for profile', done => {
      request(app)
        .get('/jobs/unpaid')
        .set('profile_id', profileId)
        .expect(200, (err, res) => {
            if(err) return done(err)
  
            expect(res.body.length).to.equal(1)
            expect(res.body[0].paid).to.equal(null)
  
            return done()
        })
    })

    it('should pay a job by id', done => {
      request(app)
        .post('/jobs/2/pay')
        .set('profile_id', profileId)
        .expect(200, (err, res) => {
            if(err) return done(err)
  
            expect(res.body).to.eql({})
  
            return done()
        })
    })

    it('should return 404 if no unpaid jobs are found for profile_id', done => {
      const profileId = 9
  
      request(app)
        .get('/jobs/unpaid')
        .set('profile_id', profileId)
        .expect(404, (err, res) => {
            if(err) return done(err)
  
            return done()
        })
    })
  })

  describe('balance', () => {
    const profileId = 1

    it('should deposit balance', done => {
      request(app)
        .post('/balances/deposit/1')
        .send({ amount: 50 })
        .set('profile_id', profileId)
        .expect(204, (err, res) => {
            if(err) return done(err)

            expect(res.body).to.eql({})

            return done()
        })
    })

    it('should not deposit balance exceeding 25% of unpaid jobs', done => {
      request(app)
        .post('/balances/deposit/1')
        .send({ amount: 500 })
        .set('profile_id', profileId)
        .expect(403, (err, res) => {
            if(err) return done(err)

            expect(res.body).to.eql({})

            return done()
        })
    })

    it('should not deposit balance if there is no profile', done => {
      request(app)
        .post('/balances/deposit/10')
        .send({ amount: 500 })
        .set('profile_id', profileId)
        .expect(404, (err, res) => {
            if(err) return done(err)

            expect(res.body).to.eql({})

            return done()
        })
    })
  })
})