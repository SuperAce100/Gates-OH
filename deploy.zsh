git checkout heroku-secrets
git fetch origin
git merge -X ours origin/main

npm start

git push heroku heroku-secrets:master
git checkout main