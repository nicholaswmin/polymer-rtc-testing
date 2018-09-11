# polymer-rtc-testing
Guide on unit-testing [OpenTok][opentok] WebRTC Polymer 1.0 elements.

## Overview

Testing WebRTC-enabled components is a special case when doing unit-testing.

We need 2 (or more) parallel test instances in order to simulate multi-party
calls and we also need to suppress browser-level "Share your mic/camera"-type
of dialog boxes, otherwise the tests will fail.

This guide focuses on unit-testing OpenTok Polymer 1.0 elements, where
the element needs to be tested using 2 WCT instances running in parallel.

While it focuses on OpenTok's Web SDK, it's general concepts should be
applicable to standard/vendorless WebRTC implementations.

### View the sample <rtc-element\>

[![Build Status rtc-element](https://travis-ci.org/nicholaswmin/polymer-rtc-testing.svg?branch=master)](https://travis-ci.org/nicholaswmin/polymer-rtc-testing)

There's a sample Polymer element in `/rtc-element` with unit-tests which are
run with the strategy illustrated in this guide.

```bash
$ cd rtc-element
$ npm install -g polymer-cli mocha
$ npm install && bower install
$ npm test
```

## Guide

### Add important [WCT][wct] configuration

Add the following `wct.conf.json` in your element's directory.

```javascript
{
  "expanded": true,
  "suites": ["test/*.html"],
  "plugins": {
    "local": {
      "browsers": [
        "chrome"
      ],
      "browserOptions": {
        "chrome": [
          "auto-select-desktop-capture-source='Entire screen'",
          "use-fake-device-for-media-stream",
          "use-fake-ui-for-media-stream"
        ]
      }
    }
  }
}
```

This tells WCT to:

- Ignore `.js` files in `test/` since we are going to add a MochaJS test script
  there.
- Prevent pop-up of "Do you want to share your mic/camera?" dialogs.

### Run tests using [Mocha][mocha] instead of the polymer-cli

You should still write the actual unit-tests as `test-1.html`, `test-2.html`
etc in `tests/`, but instead of running them all with `$ polymer test` we are
going to use a Mocha script which executes `$ polymer test` test runs
of them, in-parallel.

In your element:

```bash
# Specify `$ mocha test/run.js` when prompted for a test script.
$ npm init
$ npm install --save-dev mocha
```

The following script spawns 2 [WCT][wct] instances, running in-parallel.

`test/run.js`:

```javascript
'use strict'

const spawn = require('child_process').spawn

// @NOTE
// Helper function that spawns N `$ polymer test` instances and returns
// a Promise which resolves if all instances have exited with 0,
// rejects otherwise.
const spawnPolymerTest = ({ times = 2 }) => {
  const tasks = Array.from({ length: times }, () => ['polymer', ['test']])
    .map(args => {
      return new Promise(resolve => {
        spawn(args[0], args[1], { stdio: 'inherit' }).on('exit', resolve)
      })
    })

  return Promise.all(tasks)
    .then(exitCodes => {
      if (!exitCodes.every(result => result === 0))
        throw new Error('Some tests have failed')

      return
    })
}

describe('Test Suite', () => {
  it ('Runs OK under normal network conditions', function() {
    this.timeout(60000)

    return spawnPolymerTest({ times: 2 })
  })

  // ... add more tests as you see fit.
})
```

Then run:

```bash
$ mocha test/run.js
```

to run your tests.

### Sample unit-test

A sample unit-test that tests a video call between 2 parties:

```javascript

suite('rtc-element', function() {
  test('Starts a call', function(done) {
    // @NOTE Allow ample timeout as calls might take a while to connect,
    // esp. under bad network conditions.
    this.timeout(10000)

    const element = fixture('basic')

    element.session.on('streamCreated', e => {
      element.session.getSubscribersForStream(e.stream)
        .forEach(subscriber => {
          subscriber.on('videoElementCreated', e => {
            // @NOTE
            // Opentok.js swallows errors in event handlers (eventing.js),
            // so we have to call `done(err)` ourselves, using `try/catch`.
            try {
              const publisherVideoElem = Polymer.dom(element.root)
                .querySelector('#publisher')
                .querySelectorAll('.OT_root')

              const subscriberVideoElem = Polymer.dom(element.root)
                .querySelector('#subscriber')
                .querySelectorAll('.OT_root')

              assert.lengthOf(Array.from(publisherVideoElem), 2)
              assert.lengthOf(Array.from(subscriberVideoElem), 1)

              // @NOTE
              // Wait for the other client to create his video element
              // and run his tests before moving on.
              setTimeout(() => done(), 3000)
            } catch (err) {
              done(err)
            }
          })
        })
    })

    element.startCall().catch(done)
  })
})
```

## Simulating bad network conditions

You should aim to test how your element fares under bad network conditions.

The [sitespeedio/throttle][sitespeedio/throttle] package is a tool that allows
system-wide throttling of network connections. It can also be used as a
Node.js module so you can easily include it in `test/run.js` to run
tests under (simulated) bad network conditions.

However it needs `sudo` permissions before it runs, runs only on Linux/MacOS
and requires that you explicitly stop it when the tests are done.

## Building on TravisCI

Sample `.travis.yml` file:

```yaml
language: node_js
sudo: required
before_script:
  - npm install -g bower polymer-cli mocha
  - sudo mv /usr/bin/google-chrome /usr/bin/google-chrome-old
  - sudo mv /usr/bin/google-chrome-beta /usr/bin/google-chrome
node_js: stable
addons:
  firefox: latest
  apt:
    sources:
      - google-chrome
    packages:
      - google-chrome-beta
script:
  - npm install
  - bower install
  - xvfb-run npm test
dist: trusty
```

## Todos

See: https://github.com/nicholaswmin/polymer-rtc-testing/issues/1.

## Resources

- [Automated Testing for OpenTok Applications in the Browser][automated-testing-opentok]
- [WebRTC - Testing][webrtc.org:testing]

## Authors

- [Nicholas Kyriakides, @nicholaswmin][nicholaswmin]

[opentok]: https://github.com/opentok
[wct]: https://github.com/Polymer/web-component-tester
[automated-testing-opentok]: https://tokbox.com/blog/automated-testing-for-opentok-applications-in-the-browser/
[nicholaswmin]: https://github.com/nicholaswmin
[sitespeedio/throttle]: https://github.com/sitespeedio/throttle
[mocha]: https://mochajs.org/
[webrtc.org:testing]: https://webrtc.org/testing/
