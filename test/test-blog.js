const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {DATABASE_URL} = require('../config');

const should = chai.should();

chai.use(chaiHttp);
 
function seedBlogData(){
	console.info('Seeding blog data');
	const seedData =[];

	for(let i=0; i<=10; i++){
		seedData.push(generateBlogData());
	}
	
	return BlogPost.insertMany(seedData);
}

function generateBlogData(){
	return {
		author:{
			firstName: faker.name.firstName(),
			lastName: faker.name.lastName()
		},

  		title: faker.lorem.words(),
 		content: faker.lorem.paragraph(),
 		created: faker.date.past()
	}
}

function tearDownDB(){
  	return new Promise((resolve, reject) => {
    console.warn('Deleting database');
    mongoose.connection.dropDatabase()
      .then(result => resolve(result))
      .catch(err => reject(err))
  });
}

describe('Testing Blog API Resource', function(){
	before(function(){
		return runServer(DATABASE_URL);
	});
	beforeEach(function(){
		return seedBlogData();
	});
	afterEach(function(){
		return tearDownDB();
	});
	after(function() {
    	return closeServer();
 	});


	describe('Get endpoint', function(){

		it('should return all blog posts', function(){
			let res;

			return chai.request(app)
				.get('/posts')
				.then(function(_res){
					res = _res;
					res.should.have.status(200);
					res.body.should.have.length.of.at.least(1);

					
					return BlogPost.count();
				})
				.then(count => {
					res.body.should.have.length.of(count);
				});
		});

		it('should return posts with right fields', function(){
			let bPosts;

			return chai.request(app)
				.get('/posts')
				.then(function(res){
					res.should.have.status(200);
					res.should.be.json;
					res.body.should.be.a('array');
					res.body.should.have.length.of.at.least(1);

					res.body.forEach(function(posts){
						posts.should.be.a('object');
						posts.should.include.keys('id','author', 'title', 'content', 'created');

					});

					bPosts = res.body[0];

					return BlogPost.findById(bPosts.id).exec();

				})
				
				.then(posts => {
					
					bPosts.author.should.equal(posts.authorName);
					bPosts.title.should.equal(posts.title);
					bPosts.content.should.equal(posts.content);
					
				});
		});
	});

describe('POST endpoint', function() {

    it('should add a new post', function() {

      const newPost = generateBlogData();

      return chai.request(app)
        .post('/posts')
        .send(newPost)
        .then(function(res) {
          res.should.have.status(201);
          res.should.be.json;
          res.body.should.be.a('object');
          res.body.should.include.keys('id', 'title', 'content', 'author', 'created');
          res.body.title.should.equal(newPost.title);
    
          res.body.id.should.not.be.null;
          res.body.author.should.equal(
            `${newPost.author.firstName} ${newPost.author.lastName}`);
          res.body.content.should.equal(newPost.content);
          return BlogPost.findById(res.body.id).exec();
        })
        .then(function(post) {
          post.title.should.equal(newPost.title);
          post.content.should.equal(newPost.content);
          post.author.firstName.should.equal(newPost.author.firstName);
          post.author.lastName.should.equal(newPost.author.lastName);
        });
    });
  });

  describe('PUT endpoint', function() {

    it('should update fields', function() {
      const updateData = {
        title: 'here is a title',
        content: 'so mch content',
        author: {
          firstName: 'April',
          lastName: 'Oneal'
        }
      };

      return BlogPost
        .findOne()
        .exec()
        .then(post => {
          updateData.id = post.id;

          return chai.request(app)
            .put(`/posts/${post.id}`)
            .send(updateData);
        })
        .then(res => {
          res.should.have.status(201);
          res.should.be.json;
          res.body.should.be.a('object');
          res.body.title.should.equal(updateData.title);
          res.body.author.should.equal(
            `${updateData.author.firstName} ${updateData.author.lastName}`);
          res.body.content.should.equal(updateData.content);

          return BlogPost.findById(res.body.id).exec();
        })
        .then(post => {
          post.title.should.equal(updateData.title);
          post.content.should.equal(updateData.content);
          post.author.firstName.should.equal(updateData.author.firstName);
          post.author.lastName.should.equal(updateData.author.lastName);
        });
    });
  });

  describe('DELETE endpoint', function() {

    it('should delete a post by id', function() {

      let post;

      return BlogPost
        .findOne()
        .exec()
        .then(_post => {
          post = _post;
          return chai.request(app).delete(`/posts/${post.id}`);
        })
        .then(res => {
          res.should.have.status(204);
          return BlogPost.findById(post.id);
        })
        .then(_post => {
// what does this do?
          should.not.exist(_post);
        });
    });
  });

});