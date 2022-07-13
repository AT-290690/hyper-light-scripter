# hyper-light-scripter

HTML cloud editor

create a .env file in root

copy env.dist content into .env

create a script-policy.js file in root

copy script-policy.js.dist content into script-policy.js or define your own policy 
* this is a whitelist for external sources (helmet headers config file)

replace DB uri with your Mongo Db uri https://www.mongodb.com/cloud/atlas/register


```
yarn
node index.js
```

Recommending a heroku deployment https://devcenter.heroku.com/articles/deploying-nodejs#deploy-your-application-to-heroku


Doc on how to use the editor: https://hyper-light-scripter.herokuapp.com/data/storage/root/entry/
