var net = require('net');
var crypto = require('crypto');

var WS = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
var ClientList = [];

function getClient(name){
    for(var i = 0; i < ClientList.length; i++){
        if(ClientList[i]['name'] == name){
            return ClientList[i];
        }
    }
    return null;
}

function pushClient(name, socket, key){
    var client = getClient(name);
    if(client){
        deleteClient(name);
    } else{
        client = {
            'name':name,
            'socket':socket,
            'key':key
        };
        ClientList.push(client);
    }
}

function deleteClient(name){
    for(var i = 0; i < ClientList.length; i++){
        if(ClientList[i]['name'] == name){
            var client = ClientList[i];
            client['socket'].destroy();
            ClientList.splice(i, 1);
        }
    }
}

function calcKey(key){
    return crypto.createHash('sha1').update(key + WS).digest('base64');
}

function decodeDataFrame(data){
    var i = 0, j, s, frame = {
        //解析前两个字节的基本数据
        FIN:data[i] >> 7,
        Opcode:data[i++] & 15,
        Mask:data[i] >> 7,
        PayloadLength:data[i++] & 0x7F
    };
    //处理特殊长度126和127
    if(frame.PayloadLength == 126)
        frame.length = (data[i++] << 8) + data[i++];
    if(frame.PayloadLength == 127){
        i += 4; //长度一般用四字节的整型，前四个字节通常为长整形留空的
        frame.length = (data[i++] << 24) + (data[i++] << 16) + (data[i++] << 8) + data[i++];
    }
    //判断是否使用掩码
    if(frame.Mask){
        //获取掩码实体
        frame.MaskingKey = [data[i++], data[i++], data[i++], data[i++]];
        //对数据和掩码做异或运算
        for(j = 0, s = []; j < frame.PayloadLength; j++)
            s.push(data[i + j] ^ frame.MaskingKey[j % 4]);
    } else
        s = data.slice(i, frame.PayloadLength); //否则直接使用数据
    //数组转换成缓冲区来使用
    s = new Buffer(s);
    //如果有必要则把缓冲区转换成字符串来使用
    if(frame.Opcode == 1)
        s = s.toString();
    //设置上数据部分
    frame.PayloadData = s;
    //返回数据帧
    return frame;
}

//NodeJS
function encodeDataFrame(data){
    var s = [],
        o = new Buffer(data.PayloadData),
        l = o.length;
    //输入第一个字节
    s.push((data.FIN << 7) + data.Opcode);
    //输入第二个字节，判断它的长度并放入相应的后续长度消息
    //永远不使用掩码
    if(l < 126)
        s.push(l);
    else if(l < 0x10000)
        s.push(126, (l & 0xFF00) >> 2, l & 0xFF);
    else
        s.push(
            127,0,0,0,0, //8字节数据，前4字节一般没用留空
            (l & 0xFF000000) >> 6, (l & 0xFF0000) >> 4, (l & 0xFF00) >> 2, l & 0xFF
        );
    //返回头部分和数据部分的合并缓冲区
    return Buffer.concat([new Buffer(s), o]);
}

var server = net.createServer();
server.on('connection', function(socket){
    var name = socket.remoteAddress + ':' + socket.remotePort;
    console.log('connected by ', name);
    socket.on('data', function(buffer){
        console.log('received data:', buffer.toString());
        var client = getClient(name);
        if(!client){
            if(buffer.toString().match(/Sec-WebSocket-Key: (.+)/)){
                var request_key = buffer.toString().match(/Sec-WebSocket-Key: (.+)/)[1];
                var accept_key = calcKey(request_key);
                pushClient(name, socket, accept_key);
                socket.write('HTTP/1.1 101 Switching Protocols\r\n');
                socket.write('Upgrade: websocket\r\n');
                socket.write('Connection: Upgrade\r\n');
                socket.write('Sec-WebSocket-Accept: ' + accept_key + '\r\n');
                socket.write('\r\n');
            }
        }
        else{
            var received = decodeDataFrame(buffer);
            console.log(received);

            if(received['PayloadData'] == 'hello'){
                console.log('send to client');
                var sendData = {
                    FIN:1,
                    Opcode:1,
                    Mask:0,
                    PayloadLength:2,
                    PayloadData:'hi'
                };
                socket.write(encodeDataFrame(sendData));
            }
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
        deleteClient(name);
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
