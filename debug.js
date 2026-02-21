const fs = require('fs');
const path = require('path');
const { View } = require('./dist/src/View');

const dir = path.join(__dirname, 'tmp-debug');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'alert.html'), '<div class="alert {{ type }}"><h1>{!! title !!}</h1><p>{!! slot !!}</p></div>');
fs.writeFileSync(path.join(dir, 'page.html'), '@component("alert", { type: "danger" }) @slot("title") Error @endslot Something went wrong. @endcomponent');

const view = new View({ viewsPath: dir });
view.render('page').then(res => console.log('RESULT:', res)).catch(console.error);
