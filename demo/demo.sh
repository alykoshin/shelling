#!/usr/bin/env bash

#node cli.js spawn pwd
#node cli.js lookup ENOENT
#node cli.js confirm "Confirm [Y/N]?"
#node cli.js keypress "Press any key... "

#node cli.js gen_certs ./demo/gen-certs-config.json

#node cli.js git queryClean
#node cli.js git readGitCredentials
#node cli.js git readSpecificGitCredentials '{"hostname":"github.com","username":"alykoshin"}'
#node cli.js git readGithubUsername
#node cli.js git readGithubToken
node cli.js git createGithubRepo '{"username":"alykoshin","name":"test","description":"test"}'

#node cli.js mongo backup ./demo/mongo-backup.json ./demo/mongo-restore.json

