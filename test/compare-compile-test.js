const LOCAL_GATEWAY = 'http://localhost:3000/';
const REMOTE_GATEWAY = 'https://www.graffiticode.com/';

const {expect} = require('chai');
const jsonDiff = require('json-diff');
const path = require('path');
const request = require('request');
const url = require('url');

const testData = require(path.resolve(__dirname, './../tools/test.json'));

describe.skip('Compare compile', function() {
  this.timeout(5000);

  function checkGateway(host, resume) {
    request.head(host, function (err, res) {
      if (err) {
        if (err.code === 'ECONNREFUSED') {
          err = new Error(`unable to connect to gateway: ${err.message}`);
        }
        return resume(err);
      }
      if (!res || res.statusCode !== 200) {
        return resume(new Error(`gateway did not return 200: ${res.statusCode}`));
      }
      resume();
    });
  }

  before('Check local', function(done) {
    checkGateway(LOCAL_GATEWAY, done);
  });

  before('Check remote gateway', function (done) {
    checkGateway(REMOTE_GATEWAY, done);
  });

  function getCompile(host, id, resume) {
    const hostUrl = new url.URL(host);
    hostUrl.searchParams.set('id', id);
    hostUrl.searchParams.set('refresh', 'true');
    hostUrl.searchParams.set('dontSave', 'true');
    hostUrl.pathname = '/data';
    request(hostUrl.toString(), function(err, res, body) {
      if (err) {
        return resume(err);
      }
      if (res.statusCode !== 200) {
        resume(new Error(`compile returned ${res.statusCode}`));
      }
      resume(null, body);
    });
  }

  function getLocalAndRemoteCompile(id, resume) {
    getCompile(LOCAL_GATEWAY, id, function(err, local) {
      if (err) {
        return resume(err);
      }
      getCompile(REMOTE_GATEWAY, id, function(err, remote) {
        if (err) {
          return resume(err);
        }
        resume(null, local, remote);
      });
    });
  }

  testData.forEach((data) => {
    // TODO(kevindy) These tests should be more hermetic (compile same data?)
    it(`should compile data: ${data}`, function(done) {
      getLocalAndRemoteCompile(data, function(err, local, remote) {
        if (err) {
          return done(err);
        }
        expect(jsonDiff.diffString(remote, local)).to.have.length(0);
        done();
      });
    });
  });

});