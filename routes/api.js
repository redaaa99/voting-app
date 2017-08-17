var express = require('express');
var bcrypt = require('bcrypt-nodejs');
var User = require('../models/user');
var Poll = require('../models/polls');
var jwt = require('jsonwebtoken');
var router = express.Router({ caseSensitive: true });

router.delete('/polls/:id', function(request, response) {
    Poll.findById(request.params.id, function(err, poll) {
        if (err) {
            return response.status(400).send({
                message: 'No poll with specified id'
            })
        }
        if (poll) {
            var token = request.headers.authorization.split(' ')[1];
            jwt.verify(token, 'fcc', function(err, decoded) {
                if (err) {
                    return response.status(401).json('Unauthorized request: invalid token')
                } else {
                    console.log(poll)
                    if (decoded.data.name === poll.owner) {
                        poll.remove(function(err) {
                            if (err) {
                                return response.status(400).send(err)
                            } else {
                                return response.status(200).send({
                                    message: 'Deleted poll'
                                })
                            }
                        })
                    } else {
                        return response.status(403).send({
                            message: 'Can only delete own polls'
                        })
                    }
                }
            })
        }
    });
});

router.get('/polls', function(request, response) {
    Poll.find({}, function(err, polls) {
        if (err) {
            return response.status(404).send({})
        } else {
            return response.status(200).json(polls)
        }
    })
});

router.get('/poll/:id', function(request, response) {
    Poll.findOne({ _id: request.params.id }, function(err, poll) {
        if (err) {
            return response.status(400).send(err)
        } else {
            return response.status(200).send(poll)
        }
    })
})

router.get('/user-polls/:name', function(request, response) {
    if (!request.params.name) {
        return response.status(400).send({
            message: 'No user name supplied'
        })
    } else {
        Poll.find({ owner: request.params.name }, function(err, documents) {
            if (err) {
                return response.status(400).send(err)
            } else {
                return response.status(200).send(documents)
            }
        })
    }
})

router.get('/some-polls', function(request, response) {
    Poll.find({},function(err, documents) {
            if (err) {
                return response.status(400).send(err)
            } else {
                console.log(documents);
                return response.status(200).send(documents)
            }
        });
});


router.put('/polls/add-option', function(request, response) {
    var id = request.body.id;
    var option = request.body.option;
    Poll.findById(id, function(err, poll) {
        if (err) {
            return response.status(400).send(err)
        }
        for (var i = 0; i < poll.options.length; i++) {
            if (poll.options[i].name === option) {
                return response.status(403).send({
                    message: 'Option already exists!'
                })
            }
        }
        poll.options.push({
            name: option,
            votes: 0
        });
        poll.save(function(err, res) {
            if (err) {
                return response.status(400).send({
                    message: 'Problem has occurred in saving poll!',
                    error: err
                })
            } else {
                return response.status(201).send({
                    message: 'Successfully created a poll option!'
                })
            }
        })
    })
});

router.put('/polls/', function(request, response) {
    console.log(typeof request.body.vote);
    Poll.findById(request.body.id, function(err, poll) {
        if (err) {
            return response.status(400).send(err)
        }
        var ip = {ip : request.body.voter};
        console.log(poll);
        for(var i=0;i<poll.voters.length;i++)
        {
            if(poll.voters[i].ip === request.body.voter)
            {
                return response.status(400).send("Already voted");
            }
        }
        for (var i = 0; i < poll.options.length; i++) {
            if (poll.options[i]._id.toString() === request.body.vote) {
                console.log('hit');
                poll.voters.push(ip);
                poll.options[i].votes += 1;
                poll.save(function (err, res) {
                    if (err) {
                        return response.status(400).send(err)
                    } else {
                        return response.status(200).send({
                            message: 'Successfully updated poll!'
                        })
                    }
                })
            }
        }
    })
});

router.post('/polls', authenticate, function(request, response) {
    var poll = new Poll();
    poll.name = request.body.name;
    poll.options = request.body.options;
    poll.owner = request.body.owner;
    poll.save(function(err, document) {
        if (err) {
            if (err.code === 11000) {
                return response.status(400).send('No dupes!');
            }
            return response.status(400).send(err)
        } else {
            return response.status(201).send({
                message: 'Successfully created a poll',
                data: document
            })
        }
    })
})

router.post('/verify-token', function(request, response) {
    jwt.verify(request.body.token, 'fcc', function(err, decoded) {
        if (err) {
            return response.status(400).send({
                message: 'invalid token',
                error: err
            })
        } else {
            return response.status(200).send({
                message: 'valid token',
                decoded: decoded
            })
        }
    })
});
router.post('/login', function(request, response) {
    if (request.body.name && request.body.password) {
        User.findOne({ name: request.body.name }, function(err, document) {
            if (err) {
                return response.status(400).send(err)
            } else {
                console.log(document);
                if (bcrypt.compareSync(request.body.password, document.password)) {
                    var token = jwt.sign({
                        data: document
                    }, 'fcc', { expiresIn: 3600 });
                    console.log(token);
                    return response.status(200).send(token)
                } else {
                    return response.status(400).send({
                        message: 'Unauthorized'
                    })
                }
            }
        })
    } else {
        return response.status(400).send({
            message: 'Server error in posting to api'
        })
    }
});
router.post('/register', function(request, response) {
    if (request.body.name && request.body.password) {
        var user = new User();
        user.name = request.body.name;
        console.time('bcryptHash');
        user.password = bcrypt.hashSync(request.body.password, bcrypt.genSaltSync(10));
        console.timeEnd('bcryptHash');
        user.save(function(err, document) {
            if (err) {
                return response.status(400).send(err)
            } else {
                var token = jwt.sign({
                    data: document
                }, 'fcc', { expiresIn: 3600 })
                return response.status(201).send(token)
            }
        })

    } else {
        return response.status(400).send({
            message: 'Server error in posting to api'
        })
    }
})

// custom middleware to authenticate Header Bearer token on all secure endpoints

function authenticate(request, response, next) {
    var header = request.headers.authorization;
    if (header) {
        var token = header.split(' ')[1];
        jwt.verify(token, 'fcc', function(err, decoded) {
            if (err) {
                return response.status(401).json('Unauthorized request: invalid token')
            } else {
                next();
            }
        })
    } else {
        return response.status(403).json('No token provided')
    }
}

module.exports = router;