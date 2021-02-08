const puppeteer = require('puppeteer');
const async = require('async');
const fs = require('fs');
const imgbbUploader = require("imgbb-uploader");

const imgbb_API_KEY=process.env.IMGBB_API_KEY;//'f9713daf15ba30609b11ec36e50ff5e5';
const repoName=process.env.REPO_NAME;
const SACSID_KEY=process.env.SACSID_KEY;

fs.readdir('.',{withFileTypes:true},function (err, files){
  functionCallEachEaxample(files.filter(x => x.isFile()).map(x=>x.name).filter(x => !x.match('json')));
})

withScreenshot=true;
TO=240*1000;

function getInfo(exampleName){
  return (async()=>{
    var result={
      example:exampleName,
    };
    const page = await browser.newPage();
    await page.setCookie({
      name:'SACSID',
      value:SACSID_KEY,
      domain:'code.earthengine.google.com',
      path:'/',
      httpOnly: true,
      secure: true,
      session: false,
      priority: 'Medium'
    });
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

    try{
      await page.click('.goog-button.run-button');
    }catch(e)
    {
      console.log('can not run the script');
      console.log(e);
    }
    try{
      // wait that outputs are writen
      //await page.waitForNavigation({waitUntil: 'networkidle0',timeout:10000});
      await page.waitForSelector('.console.init pre',{timeout:TO})
      // wait the end compuation
      await page.waitForFunction(() => !document.querySelector(".console.init .loading"),{timeout:TO});
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
      const element = await page.$('.console.init');
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
      await page.$$eval('.json-switch', list => list.map((element) => { return element.click(); }));
      //capture json value
      var obj=await page.$$eval('.console.init pre', list =>
        list.map((element) => {return element.innerHTML})
        );
      result.functions=JSON.parse(obj[obj.length-1].replace(/(<([^>]+)>)/gi, ""));
    }catch(e)
    {
      console.log('can not read JSON at end of the script');
      console.log(e);
    }

    await page.close();
    return result;
  })
};


  //result=new Array(listExample.length);
  async function functionCallEachEaxample(listExample){
    console.log(listExample)
    browser = await puppeteer.launch({ defaultViewport: {width: 1920, height: 1080} });//{headless: false}
    async.parallelLimit(listExample.map(getInfo),4,function(err, results) {
      console.log(results);
      listVal={};
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


