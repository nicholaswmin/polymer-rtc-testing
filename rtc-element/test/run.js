'use strict'

const spawn = require('child_process').spawn

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
    this.timeout(50000)

    return spawnPolymerTest({ times: 2 })
  })
})
