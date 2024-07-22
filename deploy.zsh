git checkout heroku-secrets
git fetch origin
git merge -X ours origin/main -m "Merge main into heroku-secrets"
git push heroku heroku-secrets:master
git checkout main