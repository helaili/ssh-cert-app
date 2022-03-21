const { createProbot } = require('probot')
const { exec } = require('child_process')
const fs = require('fs')
const express  = require('express')
const bodyParser = require('body-parser')

/**
 * @param {import('probot').Probot} app
 */
module.exports = (app, { getRouter }) => {
  app.log.info('Starting SSH Certificate Broker')
  const generatedCerts = {}
  const certFile = process.env['CERT_FILE']
  const certDuration = process.env['CERT_DURATION']
  const router = getRouter('/ssh-cert-app')

  // Use any middleware
  router.use(express.static('public'))
  router.use(bodyParser.json())

  // Route to send back the generated certificate
  router.post("/fetch", (req, res) => {
    app.log.debug(`Looking for certificate for ${req.body.sessionToken}`)

    if (generatedCerts[req.body.sessionToken]) {
      const filenamePrefix = generatedCerts[req.body.sessionToken].pubKeyFileName.split('.')[0]
      fs.readFile(`${__dirname}/${req.body.sessionToken}/${filenamePrefix}-cert.pub`, 'utf8', (err,data) => {
        if (err) {
          app.log.debug(err)
          res.status(404).send({message: 'Certificate not found'})
        } else {
          app.log.debug(data)
          res.send({certificate: data})

          // Let's clean up memory and disk
          delete generatedCerts[req.body.sessionToken]
          fs.rmdir(`${__dirname}/${req.body.sessionToken}`, { recursive: true, force: true }, (err) => {
            if (err) {
              app.log.error(err)
            }
          })
        }
      })
    } else {
      res.status(404).send({message: 'Certificate not found'})
    }
  })

  app.on("repository_dispatch", async (context) => {
    app.log.debug({ event: context.name, action: context.payload.action, sender: context.payload.sender.login, payload: context.payload.client_payload })
    
    if (!fs.existsSync(`${__dirname}/${context.payload.client_payload.sessionToken}`)) {
      fs.mkdirSync(`${__dirname}/${context.payload.client_payload.sessionToken}`, (err) => {
        if (err) {
          app.log.error(err)
          return err
        }
        app.log.debug(`Directory ${__dirname}/${context.payload.client_payload.sessionToken} is created.`);
      })
    }
  
    const sshKeyFile = `${__dirname}/${context.payload.client_payload.sessionToken}/${context.payload.client_payload.pubKeyFileName}`
    fs.writeFileSync(sshKeyFile, context.payload.client_payload.key)
    fs.close

    // ssh-keygen -s /Users/helaili/.ssh/CA/github-ssh-authority -V '+1d' -I helaili@github.com -O extension:login@github.com=helaili ./id_rsa.pub
    
    const args = [
      '-O', `extension:login@github.com=${context.payload.sender.login}`, 
      '-s',  certFile, 
      '-I', context.payload.client_payload.title, 
      '-n', context.payload.sender.login, 
      context.payload.client_payload.pubKeyFileName
    ]

    if (certDuration) {
      args.unshift('-V', certDuration)
    }

    // Sign the key
    const script = exec(`cd ${__dirname}/${context.payload.client_payload.sessionToken} && ssh-keygen ${args.join(' ')}`)
    script.stdout.on('data', function(data){
      app.log.debug(data.toString());
    })
    script.stderr.on('data', function(data){
      app.log.debug(data.toString());
    })
    generatedCerts[context.payload.client_payload.sessionToken] = context.payload.client_payload
  })
}
