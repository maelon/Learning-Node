var http = require('http');
var querystring = require('querystring');
var url = require('url');
var server = http.createServer(function(req, res){
    console.log(req.method, req.url);
    if(req.method == 'GET'){
        var m = url.parse(req.url, true).query;
        console.log(m.name, m.password);
        res.write('ok');
    } else if(req.method == 'POST'){
        req.setEncoding('utf8');
        req.addListener('data', function(datachunk){
            console.log(datachunk);
        });
        req.addListener('end', function(){
            console.log('post end');
        });
        res.write('received');
    }
    res.end();
});
server.listen(3000);
