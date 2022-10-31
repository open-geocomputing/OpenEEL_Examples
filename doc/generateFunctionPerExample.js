const { chromium } = require('playwright-extra')
const async = require('async');
const fs = require('fs');
const imgbbUploader = require("imgbb-uploader");

// Load the stealth plugin and use defaults (all tricks to hide playwright usage)
// Note: playwright-extra is compatible with most puppeteer-extra plugins
const stealth = require('puppeteer-extra-plugin-stealth')()

// Add the plugin to playwright (any number of plugins can be added)
chromium.use(stealth)

const imgbb_API_KEY=process.env.IMGBB_API_KEY;
const repoName=process.env.REPO_NAME;
const email=process.env.GEE_EMAIL;
const password=process.env.GEE_PWD;

fs.readdir('.',{withFileTypes:true},function (err, files){
  functionCallEachEaxample(files.filter(x => x.isFile()).map(x=>x.name).filter(x => !x.match('json')).filter(x => !x.match('sh')).filter(x => !x.startsWith('.')));
})

var headless=false;
withScreenshot=false;
TO=360*1000;

function getInfo(exampleName){
  return (async()=>{
    var result={
      example:exampleName,
    };
    const page = await context.newPage();
    try{
      await page.waitForTimeout(Math.random()*3000)
      await page.goto("https://code.earthengine.google.com/?scriptPath="+repoName+":"+exampleName);
      await page.waitForNavigation({waitUntil: 'networkidle0',timeout:TO});
    }catch(e)
    {
      console.log('can not navigate to the page');
      console.log(e);
    }
    // inject GEE code
    if(withScreenshot){
      try{
        const codeBox = await page.$('.ace_content');
        var base64_1 = await codeBox.screenshot({ encoding: "base64" })
      }catch(e)
      {
        console.log('can not screenshot codebox');
        console.log(e);
      }
      const optionsUpload1 = {
        apiKey: imgbb_API_KEY,//process.env.IMGBB_API_KEY, // MANDATORY
        name: 'code_'+exampleName, // OPTIONAL: pass a custom filename to imgBB API
        expiration: 3600,
        base64string:base64_1
      };
      try{
        result.code=(await imgbbUploader(optionsUpload1)).url_viewer;
      }catch(e)
      {
        console.log('can not codebox upload screenshot');
        console.log(e);
      }
    }
    //console.log("wait on run button");
    try{
      await page.waitForSelector('.goog-button.run-button')
      await page.waitForTimeout(10000);
      await page.click('.goog-button.run-button');
    }catch(e)
    {
      console.log('can not run the script');
      console.log(e);
    }

    //console.log("wait on output")
    try{
      // wait that outputs are writen
      //await page.waitForNavigation({waitUntil: 'networkidle0',timeout:10000});
      await page.waitForSelector('ee-console ee-console-log',{timeout:TO})
      // wait the end compuation
      await page.waitForFunction(() => !document.querySelector("ee-console ee-console-log .loading"),{timeout:TO});
      await page.waitForTimeout(10000);
    }catch(e)
    {
      console.log('script don\'t finish');
      console.log(e);
    }
    // const rightPanel = await page.$('.goog-splitpane-second-container');

    if(withScreenshot){
      try{
      // //save concole output
      const element = await page.$('ee-console');
      //await element.screenshot({path: 'console_'+exampleName+'.png'});
      var base64_2 = await element.screenshot({ encoding: "base64" })
      }catch(e)
      {
        console.log('can not screenshot element');
        console.log(e);
      }
      const optionsUpload2 = {
        apiKey: imgbb_API_KEY,//process.env.IMGBB_API_KEY, // MANDATORY
        name: 'console_'+exampleName, // OPTIONAL: pass a custom filename to imgBB API
        expiration: 3600,
        base64string:base64_2
      };


      try{
        result.console=(await imgbbUploader(optionsUpload2)).url_viewer;
      }catch(e)
      {
        console.log('can not codebox upload screenshot');
        console.log(e);
      }
    }

    try{
    // set all output in json mode
      // await page.$$eval('.json-switch', list => list.map((element) => { return element.click(); }));
      // //capture json value

      // $('ee-console ee-console-log:last-child div:last-child pre').innerText
      // var obj=await page.$$eval('.console.init pre', list =>
      //   list.map((element) => {return element.innerHTML})
      //   );
      // result.functions=JSON.parse(obj[obj.length-1].replace(/(<([^>]+)>)/gi, ""));

      await page.click('ee-console ee-console-log:last-child div:last-child .json-switch');
      let obj=await page.$eval('ee-console ee-console-log:last-child div:last-child pre', e=>e.innerText);
      result.functions=JSON.parse(obj);//.replace(/(<([^>]+)>)/gi, ""));
    }catch(e)
    {
      console.log('can not read JSON at end of the script');
      console.log(e);
    }
    //console.log(result)
    await page.close();
    return result;
  })
};



async function loginGoogle(browser,headless){
  const page=await browser.newPage();
  //await page.goto("https://code.earthengine.google.com");

  const navigationPromise = page.waitForNavigation()

  await page.setExtraHTTPHeaders({
      'accept-language': 'en-US,en;q=0.9,hy;q=0.8'
  });
  await page.setExtraHTTPHeaders({
      'accept-language': 'en-US,en;q=0.9,hy;q=0.8'
  });
  await page.goto('https://code.earthengine.google.com/')

  await navigationPromise


  if(headless){

    // add some magic

  }else
  {
    await page.waitForSelector('input[type="email"]')
    await page.click('input[type="email"]')

    await navigationPromise

    //TODO : change to your email 
    await page.type('input[type="email"]', email)

    await page.waitForSelector('#identifierNext')
    await page.click('#identifierNext')

    await page.waitForTimeout(1000);

    await page.waitForSelector('input[type="password"]')
    await page.click('input[type="password"]')
    await page.waitForTimeout(1000);

    //TODO : change to your password
    await page.type('input[type="password"]', password)

    await page.waitForSelector('#passwordNext')
    await page.click('#passwordNext')
    await navigationPromise
    await page.waitForTimeout(1000);
  }
  
}

  //result=new Array(listExample.length);
  async function functionCallEachEaxample(listExample){
    console.log(listExample)
    browser = await chromium.launch({ignoreDefaultArgs: ['--disable-component-extensions-with-background-pages'], defaultViewport: {width: 1920, height: 2400},headless: headless });//{headless: false}
    context = await browser.newContext()
    await loginGoogle(context,headless)
    async.parallelLimit(listExample.map(getInfo),5,function(err, results) {
      console.log(results);
      var listVal={};
      results.forEach(
        function(x){x.functions.forEach(
          function(y){
            if(!listVal[y.fullpath])
            {
              listVal[y.fullpath]=new Set();
            }
            listVal[y.fullpath].add(x.example)
          })
      })
      Object.keys(listVal).map( function(key){listVal[key]=Array.from(listVal[key])});
      listVal.timeSinceEpoch=Date.now();
      var outputFilename = 'doc/functionPerExample.json';
      fs.writeFile(outputFilename, JSON.stringify(listVal, null, 4), function(err) {
        if(err) {
          console.log(err);
        } else {
          console.log('JSON saved to ' + outputFilename);
        }
      });
      browser.close()
  })
  };


