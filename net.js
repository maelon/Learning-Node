var net = require('net');

var server = net.createServer();
server.on('connection', function(socket){
    console.log('connected by ', socket.remoteAddress + ':' + socket.remotePort);
    //socket.setEncoding('utf8');
    socket.on('data', function(buffer){
        console.log('received data:', buffer.toString());
        if(buffer.toString() == 'hello\r\n'){
            console.log('send data to client');
            var b = new Buffer(4);
            b.writeUInt8(0x68, 0);
            b.writeUInt8(0x69, 1);
            b.writeUInt8(0x0d, 2);
            b.writeUInt8(0x0a, 3);
            socket.write(b);
            //socket.write('hi\r\n', 'utf8');
            //socket.end();
        }
    });
    socket.on('end', function(){
        console.log('received data end');
    });
    socket.on('timeout', function(){
        console.log('socket timeout');
    });
    socket.on('error', function(error){
        console.log('socket error');
    });
    socket.on('close', function(had_error){
        console.log('socket close');
    });
});
server.on('close', function(){
    console.log('server close');
});
server.on('error', function(error){
    console.dir(error);
});
server.listen(3000);
console.log('socket server is listening at port 3000');
