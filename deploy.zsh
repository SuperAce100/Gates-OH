git checkout heroku-secrets
git fetch origin
git merge -X ours origin/main
git push heroku heroku-secrets:master
git checkout main
