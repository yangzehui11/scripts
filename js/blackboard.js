
class Draw {
    constructor(el,server) {
        this.el=el
        this.server=server
        this.div=document.getElementById(this.el)
        this.canvas
        this.live={'qie':[],'scenes':[]};//直播的所有数据，包括场景，切换，图片，总时长
        //this.scenes=[];//所有场景，结束直播时写入到文件里
        this.currentPPt=0;//当前是第几个场景
        this.sceneOne;//当前场景
        //this.qie=[];//场景轨迹
        //this.scenes['imgs']=[]//所有ppt
        this.startTime=null;//直播的开始时间
        this.operate='line';//进行的是什么操作，line是画线，rubber是擦除，后续还有text敲汉字
        this.yonghuState
        this.huifangStartTime
        this.arr=[]//回放功能的定时器存放在
        this.roomId;
        this.classFlag=false;
    }
    //创建房间
    createRoom(roomId){
            this.roomId=roomId
            this.ws= io(this.server, {
                query: {
                    uuid: this.roomId,
                    role:`zhubo`,
                    userId: `client_${Math.random()}`,
                },
                transports: ['websocket']
            });

            this.ws.emit('inRoom',{uuid:this.roomId,roomToken:'token111',role:'zhubo'})
            this.ws.on('inRoom',(data)=>{
                if(data){
                    this.readyZhubo()
                }
            })

    }
    //主播
    readyZhubo(){
        //清空div
        this.div.innerHTML=''

        let div1 = document.createElement('div');//创建一个标签
        let canvas = document.createElement('canvas');//创建一个标签
        canvas.setAttribute('width', 4000);//给创建的div设置id值；
        canvas.setAttribute('height', 3000);//给创建的div设置id值；]
        div1.appendChild(canvas)
        this.div.appendChild(div1)

        let div2 = document.createElement('div');//创建一个标签
            //开始/结束，橡皮擦，画笔，颜色添加到div2中

        let startBtn = document.createElement('input');
        startBtn.setAttribute('type', 'button');
        startBtn.setAttribute('value', '上课');

        let rubberBtn = document.createElement('input');
        rubberBtn.setAttribute('type', 'button');
        rubberBtn.setAttribute('value', '橡皮擦');

        let lineBtn = document.createElement('input');
        lineBtn.setAttribute('type', 'button');
        lineBtn.setAttribute('value', '画笔');

        let colorBtn = document.createElement('input');
        colorBtn.setAttribute('type', 'color');

        let upPPT = document.createElement('input');
        upPPT.setAttribute('type', 'button');
        upPPT.setAttribute('value', '<<');

        let downPPT = document.createElement('input');
        downPPT.setAttribute('type', 'button');
        downPPT.setAttribute('value', '>>');

        let pullppt = document.createElement('input');
        pullppt.setAttribute('type', 'file');
        pullppt.setAttribute('id', 'f');

        div2.appendChild(upPPT);
        div2.appendChild(pullppt);
        div2.appendChild(startBtn);
        div2.appendChild(rubberBtn);
        div2.appendChild(lineBtn);
        div2.appendChild(colorBtn);
        div2.appendChild(downPPT);
        this.div.appendChild(div2)

        let div3 = document.createElement('div');//创建一个标签

        this.canvas=canvas
        this.ctx = this.canvas.getContext('2d')
        this.ctx.strokeStyle='red'
        this.ctx.lineJoin='round';//圆
        this.ctx.lineCap = 'round';
        this.stage_info = this.canvas.getBoundingClientRect()

        pullppt.onchange= () => {
            if(this.live.classFlag==false){
                let picture = pullppt.files;
                let formData = new FormData();
                formData.append('file', picture[0]);
                fetch('http://localhost:8080/upload', {
                    method:'post',
                    body:formData,
                }).then(response =>response.json()).then(data => {
                    if(data!=null){
                        div3.innerHTML=''
                        for (let i = 0; i < data.arr.length; i++) {
                            let img = document.createElement('img');//创建一个标签
                            img.setAttribute('width','80px')
                            img.setAttribute('height','60px')
                            img.setAttribute('src',data.arr[i])
                            img.setAttribute('id',i)
                            img.onclick=()=>{
                                img.style.border='red'
                                this.qiePPT(i)
                            }
                            div3.appendChild(img)
                        }
                        this.div.appendChild(div3)
                        this.live['imgs']=data.arr
                        //大屏显示ppt
                        let img=this.live['imgs'][this.currentPPt]
                        this.canvas.style.backgroundImage='url('+img+')'
                        this.canvas.style.backgroundSize='cover'
                    }
                }).catch(function(e){
                    alert('error:' + e);
                })
            }else {
                alert('上课状态不能换ppt')
            }


        }

        upPPT.onclick= () => {
            if(this.currentPPt>0)
            this.qiePPT(this.currentPPt-1)
        }
        downPPT.onclick= () => {
            if(this.currentPPt<this.live['imgs'].length-1)
                this.qiePPT(this.currentPPt+1)
        }
        startBtn.onclick= () => {
            if(startBtn.value=='上课'){
                this.live['classFlag']=true
                this.startScene()
                startBtn.value='下课'
            }else if(startBtn.value=='下课'){
                this.live['classFlag']=false
                this.liveEnd()
                startBtn.value='上课'
            }
        }
        rubberBtn.onclick= () => {
            this.rubber()
        }
        lineBtn.onclick= () => {
            //this.line(document.getElementById(lineSizeVal).value||30)
            this.line()
        }

        colorBtn.onchange= () => {
            this.color(colorBtn.value)
        }
        load()
        window.onbeforeunload=()=> {
            //如果是上课中状态，则保存。下课状态不进行操作
            if(this.live['classFlag']==true){
                this.liveEnd();
            }
        }

        this.ws.emit('ready',{uuid:this.roomId,roomToken:'token111',role:'zhubo'})
        this.ws.on('ready', (data)=> {
            this.live=data
            this.startTime=new Date().getTime()-this.live.time
            //下面小图片
            for (let i = 0; i < this.live.imgs.length; i++) {
                let img = document.createElement('img');//创建一个标签
                img.setAttribute('width','80px')
                img.setAttribute('height','60px')
                img.setAttribute('src',this.live.imgs[i])
                img.setAttribute('id',i)
                img.onclick=()=>{
                    //img.style.border='red'
                    this.qiePPT(i)
                }
                div3.appendChild(img)
            }
            this.div.appendChild(div3)
            //如果是正在上课中的状态
            if(this.live.classFlag==true){
                startBtn.value='下课'
                //此时不应该用大图片做背景，而是显示该场景
                let qieOne=this.live.qie.pop()
                let currentPPT
                if(qieOne.ppt<0){
                    if(this.live.qie.length>0){
                        currentPPT=this.live['qie'][this.live.qie.length-1]['ppt']
                    }
                }else {
                    currentPPT=qieOne.ppt
                    this.live.qie.push(qieOne)
                }
                this.qiePPT(currentPPT)
            }
        })

        window.onresize=load
        window.onload=load
        function load () {
            let h=document.documentElement.clientHeight-100
            canvas.style.width=parseInt(h*(4/3))+'px';
            canvas.style.height=parseInt(h)+'px';
            div2.style.width=parseInt(h*(4/3))+'px';
            div3.style.width=parseInt(h*(4/3))+'px';
            div3.style.height=65+'px';
            div3.style.overflow='auto'
        }
    }
    startScene(){
        /*this.ctx.height=this.canvas.height
        this.ctx.width=this.canvas.width*/
        //this.live['scenes']=[]
        for (let i = 1; i <=this.live.imgs.length ; i++) {
            this.live.scenes.push({'id':i,'ppt':'','content':[],'screenSize':[this.ctx.width,this.ctx.height]})
        }
        //this.ws.e('start:'+ppt)//ppt:总的ppt数量
        this.startTime=new Date().getTime()
        this.qiePPT(this.currentPPt)
    }


    //用户进入直播间
    inRoom(roomId){
            this.roomId=roomId
            this.ws= io(this.server, {
                query: {
                    uuid: this.roomId,
                    role:`yonghu`,
                    userId: `client_${Math.random()}`,
                },
                transports: ['websocket']
            });

            this.ws.emit('inRoom',{uuid:this.roomId,roomToken:'token111',role:'yonghu'})
            this.ws.on('inRoom', (data)=> {
                if(data){
                    //alert('进入房间成功')
                    this.readyYonghu()
                }
            });
    }

    //用户
    readyYonghu() {
        //清空div
        this.div.innerHTML=''
        //画板添加到div中
        let div1 = document.createElement('div');//创建一个标签

        let canvas = document.createElement('canvas');
        canvas.setAttribute('width', 4000);
        canvas.setAttribute('height', 3000);
        div1.appendChild(canvas);
        let roomIdDiv = document.createElement('div');
        roomIdDiv.innerText='房间号：'+this.roomId
        roomIdDiv.style.cssFloat='left'
        div1.appendChild(roomIdDiv);
        this.div.appendChild(div1);//把创建的节点frameDiv 添加到父类body 中；
        this.canvas=canvas
        this.ctx = this.canvas.getContext('2d')
        this.ctx.strokeStyle='red'
        this.ctx.lineJoin='round';//圆
        this.ctx.lineCap = 'round';
        this.ws.emit('ready',{uuid:this.roomId,roomToken:'token111',role:'yonghu'})
        this.ws.on('liveClass',(data)=> {
            //console.log(data.toString())
            this.sceneOne=data
            this.init1()
        })
        this.ws.on('liveClassQie',(data)=> {
            //console.log(data.toString())
            this.sceneOne=data
            this.init()
        })
        this.ws.on('liveEnd',(data)=> {
            alert('下课')
        })

        /*window.onbeforeunload=()=>{
            alert(111)
            this.inRoom(this.roomId)
        }*/
        load()
        window.onresize=load
        window.onload=load
        function load () {
            let h=document.documentElement.clientHeight*0.9
            canvas.style.width=parseInt(h*(4/3))+'px';
            canvas.style.height=parseInt(h)+'px';

        }
    }

    line(lineSize) {

        this.operate = 'line'
        this.ctx.lineWidth = lineSize || 20
        let bili = this.bili()
        let endX;
        let endY;
        let isDown=false;
        let points=[]
        let p=[]
        let stage_info=this.stage_info
        let startTime=this.startTime
        //按下
        this.canvas.onmousedown = () => {
            isDown=true
            bili = this.bili()
            if(this.operate=='line'){
                isDown = true;
                endX = parseInt((event.clientX - stage_info.left) * bili)
                endY = parseInt((event.clientY - stage_info.top) * bili)
                points.push(endX + '/' + endY);
                let time = new Date().getTime() - startTime
                p.push(endX + '/' + endY + '/' + time)
            }
        }
        //鼠标移动时
        this.canvas.onmousemove = () => {
            if(this.operate=='line'&&isDown){
                console.log('鼠标移动')
                window.getSelection() ? window.getSelection().removeAllRanges() : document.selection.empty()
                if (!isDown) return;
                endX = parseInt((event.clientX - stage_info.left) * bili)
                endY = parseInt((event.clientY - stage_info.top) * bili)
                points.push(endX + '/' + endY);
                if (points.length > 3&&points.length % 4 == 1) {
                    let time = new Date().getTime() - startTime
                    p.push(endX + '/' + endY + '/' + time)
                    const lastTwoPoints = p.slice(-3)
                    const beginPoint = lastTwoPoints[0]
                    const controlPoint = lastTwoPoints[1]
                    const endPoint = lastTwoPoints[2]
                    this.drawLine(beginPoint, controlPoint, endPoint);
                } else if (points.length == 3) {
                    const lastTwoPoints = points.slice(-3)
                    let time = new Date().getTime() - startTime
                    p.push(endX + '/' + endY + '/' + time)
                    const beginPoint = lastTwoPoints[0]
                    const controlPoint = lastTwoPoints[1]
                    const endPoint = lastTwoPoints[2]
                    this.drawLine(beginPoint, controlPoint, endPoint);
                }

            }

        }
        //松开
        this.canvas.onmouseup = () => {
            if(this.operate=='line'){
                if (!isDown) return;
                endX = parseInt((event.clientX - stage_info.left) * bili)
                endY = parseInt((event.clientY - stage_info.top) * bili)
                points.push(endX + '/' + endY);
                if (points.length >= 3) {
                    let time = new Date().getTime() - startTime
                    p.push(endX + '/' + endY + '/' + time)
                    const lastTwoPoints = p.slice(-3);
                    const beginPoint = lastTwoPoints[0]
                    const controlPoint = lastTwoPoints[1]
                    const endPoint = lastTwoPoints[2]
                    this.drawLine(beginPoint, controlPoint, endPoint);
                    //存到场景中
                    this.live.scenes[this.currentPPt]['content'].push(this.operate + ':' + this.ctx.strokeStyle + ':' + this.ctx.lineWidth + ',' + p)
                    let scene1 = {'scene':this.live.scenes[this.currentPPt],'uuid':this.roomId,'role':'zhubo'}
                    this.ws.emit('liveClass',scene1)
                }
                isDown = false;
                points = [];
                p = []
            }

        }
        //鼠标移出画板时触发
        this.canvas.onmouseleave = () => {
            if(this.operate=='line'){
                if (!isDown) return;
                endX = parseInt((event.clientX - stage_info.left) * bili)
                endY = parseInt((event.clientY - stage_info.top) * bili)
                points.push(endX + '/' + endY);
                if (points.length >= 3) {
                    let time = new Date().getTime() - startTime
                    p.push(endX + '/' + endY + '/' + time)
                    const lastTwoPoints = p.slice(-3);
                    const beginPoint = lastTwoPoints[0]
                    const controlPoint = lastTwoPoints[1]
                    const endPoint = lastTwoPoints[2]
                    this.drawLine(beginPoint, controlPoint, endPoint);
                    //存到场景中
                    this.live.scenes[this.currentPPt]['content'].push(this.operate + ':' + this.ctx.strokeStyle + ':' + this.ctx.lineWidth + ',' + p)
                    let scene1 = {'scene':this.live.scenes[this.currentPPt],'uuid':this.roomId,'role':'zhubo'}
                    this.ws.emit('liveClass',scene1)
                }
                isDown = false;
                points = [];
                p = []
            }
        }
    }
    //画线中
    drawLine(beginPoint, controlPoint, endPoint){
        let b = beginPoint.split('/')
        let c = controlPoint.split('/')
        let e = endPoint.split('/')
        this.ctx.beginPath();
        this.ctx.moveTo((parseInt(b[0]) + parseInt(c[0])) / 2, (parseInt(b[1]) + parseInt(c[1])) / 2);
        this.ctx.quadraticCurveTo(parseInt(c[0]), parseInt(c[1]), (parseInt(c[0]) + parseInt(e[0])) / 2, (parseInt(c[1]) + parseInt(e[1])) / 2);
        this.ctx.stroke();
        this.ctx.closePath();
    }

    rubber(){
        this.operate='rubber'
        let startX
        let startY
        let endX
        let endY
        let bili
        this.canvas.onmousedown = () => {
            if (this.operate=='rubber'){
                bili=this.bili()
                startX = parseInt((event.clientX - this.stage_info.left) * bili)
                startY = parseInt((event.clientY - this.stage_info.top) * bili)
            }
        }
        /*//鼠标移动时
        this.canvas.onmousemove = () => {
            if(this.operate=='rubber'){
                console.log('鼠标移动')
                window.getSelection() ? window.getSelection().removeAllRanges() : document.selection.empty()
                endX = parseInt((event.clientX - this.stage_info.left) * bili)
                endY = parseInt((event.clientY - this.stage_info.top) * bili)

            }
        }*/
        this.canvas.onmouseup = () => {
            if (this.operate=='rubber'){
                endX = parseInt((event.clientX - this.stage_info.left) * bili)
                endY = parseInt((event.clientY - this.stage_info.top) * bili)
                let sizeX=endX-startX
                let sizeY=endY-startY
                //console.log(sizeX+'==='+sizeY)
                if(sizeX!=0&&sizeY!=0){
                    this.ctx.clearRect(startX,startY,sizeX,sizeY)
                    let time = new Date().getTime() - this.startTime
                    this.live.scenes[this.currentPPt]['content'].push(this.operate+':'+','+time+','+startX+','+startY+','+sizeX+','+sizeY)
                    console.log('rubber:'+this.live.scenes[this.currentPPt]['content'])
                    let scene1 = {'scene':this.live.scenes[this.currentPPt],'uuid':this.roomId,'role':'zhubo'}
                    this.ws.emit('liveClass',scene1)
                }/*else if(){

                }*/
            }
        }
    }
    color(colorSize){
        this.ctx.strokeStyle=colorSize||'red'
        this.line()
    }

    qiePPT(xScene/*切到第几个场景*/) {
        this.currentPPt=xScene
        //this.ctx.clearRect(0, 0, 10000, 10000)
        let img=this.live.imgs[this.currentPPt]
        this.live.scenes[this.currentPPt].ppt=img
        let time=new Date().getTime()-this.startTime
        this.sceneOne=this.live.scenes[this.currentPPt]
        let scene1 = {'scene':this.live.scenes[this.currentPPt],'uuid':this.roomId,'role':'zhubo'}
        this.ws.emit('liveClassQie',scene1)

        //let sceneOne=JSON.stringify(this.live.scenes[this.currentPPt])
        //this.ws.emit('liveClass',this.live.scenes[this.currentPPt])
        this.live.qie.push({'time':time,'ppt':this.currentPPt})//time:200,ppt:4

        this.init()
        this.line()
    }


    liveEnd(ppt){
        let time=new Date().getTime()-this.startTime

        this.live.qie.push({'time':time,'ppt':ppt||-1})
        this.live['time']=time
        let data={'role':'zhubo','uuid':this.roomId,'live':this.live}
        this.ws.emit('liveEnd',data)
    }


    init(){
        this.ctx.height=this.canvas.height
        this.ctx.width=this.canvas.width
        this.clear()
        this.canvas.style.backgroundImage='url('+this.sceneOne.ppt+')'
        this.canvas.style.backgroundSize='cover'
        //回显该场景的笔迹
        for (let i = 0; i <(this.sceneOne.content.length) ; i++) {
            let c=this.sceneOne.content[i].split(',')//一步操作的数据
            if(c[0].split(':')[0]=='line'){//如果该操作是line
                this.ctx.strokeStyle=c[0].split(':')[1]
                this.ctx.lineWidth=c[0].split(':')[2]
                for (let j = 3; j <c.length ; j++) {
                    const beginPoint=c[j-2]
                    const controlPoint=c[j-1]
                    const endPoint=c[j]
                    this.drawLine(beginPoint, controlPoint, endPoint);
                }
            }else if(c[0].split(':')[0]=='rubber'){
                this.ctx.clearRect(parseInt(c[2]),parseInt(c[3]),parseInt(c[4]),parseInt(c[5]))
            }
        }
    }
    init1() {
        this.ctx.height=this.canvas.height
        this.ctx.width=this.canvas.width
        this.clear()
        this.canvas.style.backgroundImage='url('+this.sceneOne.ppt+')'
        this.canvas.style.backgroundSize='cover'
        //回显该场景的笔迹
        for (let i = 0; i <(this.sceneOne.content.length)-1 ; i++) {
            console.log('画一笔回显场景')
            let c=this.sceneOne.content[i].split(',')//一步操作的数据
            if(c[0].split(':')[0]=='line'){//如果该操作是line
                this.ctx.strokeStyle=c[0].split(':')[1]
                this.ctx.lineWidth=c[0].split(':')[2]
                this.ctx.strokeStyle=c[0].split(':')[1]
                this.ctx.lineWidth=c[0].split(':')[2]
                for (let j = 3; j <c.length ; j++) {
                    const beginPoint=c[j-2]
                    const controlPoint=c[j-1]
                    const endPoint=c[j]
                    this.drawLine(beginPoint, controlPoint, endPoint);
                }
            }else if(c[0].split(':')[0]=='rubber'){
                console.log(c)
                this.ctx.clearRect(parseInt(c[2]), parseInt(c[3]), parseInt(c[4]),parseInt(c[5]))
            }
        }
        //最后一笔
        let pop=this.sceneOne['content'][this.sceneOne['content'].length-1]
        this.sceneOne['content'].push(pop)
        let c = pop.split(',')//一步操作的数据
        let operate=c.shift()
        let ding
        if(operate.split(':')[0]=='line'){//如果该操作是line
            this.ctx.strokeStyle=operate.split(':')[1]
            this.ctx.lineWidth=operate.split(':')[2]
            //获取第三个点的时间
            let time=c[2].split('/')[2]
            //控制画第几个点
            let i=2
            ding=setInterval(function (c,ctx) {
                let ci2 = c[i-2].split('/')
                let ci1 = c[i-1].split('/')
                let ci = c[i].split('/')
                if(time>=parseInt(ci[2])){
                    ctx.beginPath();
                    ctx.moveTo((parseInt(ci2[0]) + parseInt(ci1[0])) / 2, (parseInt(ci2[1]) + parseInt(ci1[1])) / 2);
                    ctx.quadraticCurveTo(parseInt(ci1[0]), parseInt(ci1[1]), (parseInt(ci1[0]) + parseInt(ci[0])) / 2, (parseInt(ci1[1]) + parseInt(ci[1])) / 2);
                    ctx.stroke();
                    ctx.closePath();
                    ++i
                }
                if(i>=c.length){
                    //清理定时器
                    clearInterval(ding)
                }
                time=time+10
            },10,c,this.ctx)
        }else if (operate.split(':')[0]=='rubber') {
            //获取时间
            let time=parseInt(c[0])
            ding=setInterval(function (c,ctx) {
                if(time>=parseInt(c[0])){
                    ctx.clearRect(parseInt(c[1]), parseInt(c[2]), parseInt(c[3]),parseInt(c[4]))
                    clearInterval(ding)
                }
                time=time+10
            },10,c,this.ctx)
        }
    }
    clear(){
        this.ctx.clearRect(0, 0, 10000, 10000)
    }
    bili(){
        return 3000 / (this.canvas.style.height.split('p')[0] || 1)
    }


}

