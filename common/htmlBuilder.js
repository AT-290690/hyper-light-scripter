exports.htmlBuilder = content =>
  `<!DOCTYPE html><html lang="en"><head> <meta charset="UTF-8"> <meta name="viewport" content="width=device-width, initial-scale=1.0"> <title>Hyper Light Scripter - Documentation </title> <link rel="icon" type="image/svg+xml" href="../../../../assets/images/favicon.svg"/> <link rel="icon" type="image/png" href="../../../../assets/images/favicon.png"/> <style>:root{--gutters: #292e2eeb; --comment: #546A90; --linenumbers: #546A90; --border: #A875FF; --background-primary: #000000; --background-secondary: #42C6FF60; --background-thirdly: #546A9030; --color-primary: #FBF5F3; --color-secondary: #42C6FF; --color-thirdly: #A875FF; --color-fourtly: #FFCE2E; --font-family: "Fantastic"; --error: #ed1212;}@font-face{font-family: 'Fantastic'; src: url(../../../../../assets/fonts/FantasqueSansMono-Regular.ttf) format('truetype'); font-display: swap;}html{scroll-behavior: smooth;}body{color: white; background: var(--background-primary); font-family: var(--font-family);}.title{font-size: 15px;}.subtitle{color: var(--color-thirdly); font-size: 15px;}.description{font-size: 12px; color: var(--comment); text-align: center;}a{text-decoration: none; color: var(--comment);}a:link{text-decoration: none;}a:hover{color: var(--color-fourtly);}.card{border-top: 1px solid var(--comment); border-bottom: 1px solid var(--comment); cursor: pointer;}.card:hover{background-color: var(--background-thirdly);}.logo{cursor: pointer; margin-top: 10px; margin-bottom: 10px;}
  .shake { animation: shake-animation 3.52s ease infinite; transform-origin: 50% 50%; }

  @keyframes shake-animation {
    0% { transform: translate(0, 0); }
    1.78571% { transform: translate(5px, 0); }
    3.57143% { transform: translate(0, 0); }
    5.35714% { transform: translate(5px, 0); }
    7.14286% { transform: translate(0, 0); }
    8.92857% { transform: translate(5px, 0); }
    10.71429% { transform: translate(0, 0); }
    100% { transform: translate(0, 0); }
  }
  </style></head><body> <div style="text-align: center;"> ${content} </div>
  </body></html>`;
