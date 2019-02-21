#!/usr/bin/env bash

#node cli.js spawn pwd
#node cli.js lookup ENOENT
#node cli.js confirm "Confirm [Y/N]?"
#node cli.js keypress "Press any key... "

node cli.js gen_certs ./demo/gen-certs-config.json

#node cli.js git queryClean
#node cli.js mongo backup ./demo/mongo-backup.json ./demo/mongo-restore.json

