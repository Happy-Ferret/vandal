function create_element(name, style){
    var element = document.createElement(name)
    for (var key in style) {
        if (style.hasOwnProperty(key)) {
            element.style.setProperty(key, style[key])
        }
    }
    return element
}

function create_toolbar(){
    function create_button(background){
        var button = create_element("div", {
            "width"     : "50px",
            "height"    : "50px",
            "float"     : "left",
            "cursor"    : "pointer",
            "background": "url(http://" + DOMAIN + ":" + HTTP_PORT + "/static/" + background + ") no-repeat scroll 6px 6px transparent"
        })
        return button
    }
    function create_shadow(left){
        return create_element("div", {
            "position"      : "absolute",
            "width"         : "38px",
            "height"        : "38px",
            "margin"        : "5px",
            "float"         : "left",
            "top"           : "0px",
            "left"          : left + "px",
            "border-radius" : "5px",
            "cursor"        : "pointer",
            "box-shadow"    : "inset -1px 1px 3px 0px rgba(0, 0, 0, 0.3)"
        })
    }
    toolbar = create_element("div", {
        "position"        : "fixed",
        "top"             : "0px",
        "left"            : "0px",
        "width"           : "269px",
        "height"          : "75px",
        "border"          : "2px solid #000000",
        "background-color": "#FFFFFF",
        "border-radius"   : "5px 0px 0px 5px",
        "box-shadow"      : "-2px 2px 5px 0px rgba(0, 0, 0, 0.3)"
    })
    toolbar.id = "fixed_toolbar"  // needed for jscolor
    var button_toggle_chat = create_button("chat.png"),
        button_color       = create_element("input"),
        handle             = create_element("div"),
        tool_on            = create_shadow(49),
        chat_on            = create_shadow(150),
        button_pen         = create_button("pen.png"),
        button_eraser      = create_button("eraser.png"),
        button_close       = create_button("close.png"),
        click_x            = null, // toolbar movements
        click_y            = null  // toolbar movements
    button_pen.onclick = function(){
        send_change_tool(1)
        tool_on.style.left = "49px"
    }
    button_eraser.onclick = function(){
        send_change_tool(0)
        tool_on.style.left = "100px"
    }
    button_close.onclick = destroy
    // color
    if (document.compatMode == "BackCompat"){
        button_color.style.width = "26px"
        button_color.style.height = "28px"
    }else{
        button_color.style.width = "24px"
        button_color.style.height = "24px"
    }
    button_color.style.cssFloat = "left"
    button_color.style.cursor = "pointer"
    button_color.style.margin = "12px"
    button_color.style.border = "1px solid black"
    button_color.style.padding = "0px"
    button_color.onfocus = function(){this.blur()}
    var color_picker_container = create_element("div", {
            "background-color": "white",
            "height"          : "150px",
            "border"          : "1px solid lightgray",
            "border-radius"   : "2px",
            "margin-top"      : "80px",
            "padding"         : "10px",
            "display"         : "none"
        }),
        color_picker_picker_wrapper = create_element("div", {
            "float"   : "left",
            "left"    : "15px",
            "width"   : "200px",
            "height"  : "150px",
            "position": "relative",
            "display" : "inline-block"
        }),
        color_picker_picker = create_element("div", {
            "height"  : "150px"
        }),
        color_picker_picker_indicator = create_element("div", {
            "width"         : "4px",
            "height"        : "4px",
            "position"      : "absolute",
            "border"        : "1px solid white",
            "pointer-events": "none"
        }),
        color_picker_slider_wrapper = create_element("div", {
            "float"   : "left",
            "width"   : "30px",
            "height"  : "150px",
            "position": "relative",
            "display" : "inline-block"
        }),
        color_picker_slider = create_element("div", {
            "height"  : "150px"
        }),
        color_picker_slider_indicator = create_element("div", {
            "width"         : "100%",
            "height"        : "10px",
            "left"          : "-1px",
            "position"      : "absolute",
            "border"        : "1px solid black",
            "pointer-events": "none"
        })
    color_picker_slider_wrapper.appendChild(color_picker_slider)
    color_picker_slider_wrapper.appendChild(color_picker_slider_indicator)
    color_picker_picker_wrapper.appendChild(color_picker_picker)
    color_picker_picker_wrapper.appendChild(color_picker_picker_indicator)
    color_picker_container.appendChild(color_picker_slider_wrapper)
    color_picker_container.appendChild(color_picker_picker_wrapper)
    button_color.addEventListener(
        "click",
        function(e) {
            if (color_picker_container.style.display === "none") {
                color_picker_container.style.display = "block"
            } else {
                color_picker_container.style.display = "none"
            }
        },
        false
    )

    var first_time_color_changes = true;
    var cp = ColorPicker(
        color_picker_slider,
        color_picker_picker,
        // mouse move callback: update indicators
        function(hex, hsv, rgb, pickerCoordinate, sliderCoordinate) {
            ColorPicker.positionIndicators(
                color_picker_slider_indicator,
                color_picker_picker_indicator,
                sliderCoordinate,
                pickerCoordinate
            )
            var negative = color_negative([rgb.r, rgb.g, rgb.b])
            color_picker_picker_indicator.style.borderColor = (
                "rgb(" + negative[0] + "," + negative[1] + "," + negative[2] +
                ")"
            )
            button_color.style.backgroundColor = hex
        },
        function(rgb) {  // mouse up callback: set color
            my_color = [rgb.r, rgb.g, rgb.b]
            send_change_color.apply(this, my_color)
        }
    )
    cp.setHex("#000000")
    ColorPicker.positionIndicators(
        color_picker_slider_indicator,
        color_picker_picker_indicator,
        {"x": 0, "y": -6},
        {"x": -3, "y": 147}
    )
    // end color
    // toggle_chat
    function toggle_chat_window(){
        if (chat_div.style.display != "none"){
            chat_div.style.display = "none"
            chat_on.style.display = "none"
        }else{
            chat_div.style.display = "block"
            chat_on.style.display = "block"
        }
    }
    button_toggle_chat.onclick = toggle_chat_window
    chat_on.onclick = toggle_chat_window
    // end toggle_chat
    // handle
    handle.style.width = "14px"
    handle.style.height = "75px"
    handle.style.cssFloat = "right"
    handle.style.background = "url(http://" + DOMAIN + ":" + HTTP_PORT + "/static/handle.png) repeat scroll 0 0 transparent"
    // end handle

    // zoom slider
    var zoom_min_img = create_element("div", {
        "width"     : "25px",
        "height"    : "25px",
        "margin-left": "5px",
        "margin-top": "-5px",
        "float"     : "left",
        "background": "url(http://" + DOMAIN + ":" + HTTP_PORT + "/static/zoom_min.png) no-repeat scroll 6px 6px transparent"
    })
    var zoom_max_img = create_element("div", {
        "width"     : "25px",
        "height"    : "25px",
        "margin-right": "15px",
        "margin-top": "-5px",
        "float"     : "right",
        "background": "url(http://" + DOMAIN + ":" + HTTP_PORT + "/static/zoom_max.png) no-repeat scroll 6px 6px transparent"
    })
    zoom_slider = create_element("input", {
        "float"     : "left",
        "width"     : "183px",
        "margin"    : "0",
        "padding"   : "0"
    })
    var zoom_msg = "Use Alt + mousewheel to zoom in and out"
    zoom_max_img.title = zoom_msg
    zoom_min_img.title = zoom_msg
    zoom_slider.title = zoom_msg
    if (document.compatMode == "BackCompat"){
        zoom_min_img.style.marginLeft = "-240px"
        zoom_min_img.style.marginTop = "45px"
        zoom_slider.style.marginLeft = "-10px"
        zoom_slider.style.width = "164px"
    }
    zoom_slider.type = "range"
    zoom_slider.min = logn(ZOOM_MIN, ZOOM_FACTOR).toFixed(1)
    zoom_slider.max = logn(ZOOM_MAX, ZOOM_FACTOR).toFixed(1)
    zoom_slider.value = 0
    zoom_slider.step = 0.1
    zoom_slider.oninput = function(e){
        zoom = Math.pow(ZOOM_FACTOR, Number(e.target.value))
        set_zoom()
    }
    // end zoom slider

    toolbar.appendChild(button_color)
    toolbar.appendChild(button_pen)
    toolbar.appendChild(button_eraser)
    toolbar.appendChild(chat_on)
    toolbar.appendChild(button_toggle_chat)
    toolbar.appendChild(tool_on)
    toolbar.appendChild(button_close)
    toolbar.appendChild(handle)
    toolbar.appendChild(zoom_min_img)
    toolbar.appendChild(zoom_slider)
    toolbar.appendChild(zoom_max_img)
    toolbar.appendChild(color_picker_container)
    toolbar.style.zIndex = 4
    document.body.appendChild(toolbar)


    function mousemove(ev){
        toolbar.style.left = ev.clientX - click_x + "px"
        toolbar.style.top  = ev.clientY - click_y + "px"
    }

    handle.onmousedown = function(ev){
        document.body.style.cursor = "move"
        mask_canvas.style.cursor = "move"
        click_x = ev.clientX - parseInt(toolbar.style.left, 10)
        click_y = ev.clientY - parseInt(toolbar.style.top, 10)
        document.addEventListener("mousemove", mousemove, false)
        return false
    }

    document.addEventListener(
        "mouseup",
        function(ev){
            document.body.style.cursor = ""
            mask_canvas.style.cursor = "crosshair"
            document.removeEventListener("mousemove", mousemove, false)
        },
        false
    )
}

function create_loading_box(){
	loading_box = create_element("div", {
        "position"        : "fixed",
        "top"             : "50%",
        "left"            : "50%",
        "margin-left"     : "-100px",
        "margin-top"      : "-25px",
        "width"           : "200px",
        "height"          : "50px",
        "border"          : "2px solid #000000",
        "background-color": "white",
        "padding"         : "10px",
        "font-family"     : "Arial, Helvetica, sans-serif",
        "font-size"       : "36px",
        "font-weight"     : "normal",
        "font-variant"    : "normal",
        "font-style"      : "normal",
        "line-height"     : "50px",
        "text-align"      : "center",
        "z-index"         :  5
    })
    progress_bar = document.createElement("progress")
    progress_bar.value = 0
    progress_bar.max = 100
    progress_bar.removeAttribute("value")
    progress_bar.style.setProperty("width", "100%")
    loading_box.appendChild(progress_bar)
    document.body.appendChild(loading_box)
}

function create_warning_box(){
	warning_box = create_element("div", {
        "position"        : "fixed",
        "top"             : "50%",
        "left"            : "50%",
        "margin-left"     : "-150px",
        "margin-top"      : "-55px",
        "width"           : "300px",
        "height"          : "110px",
        "border"          : "6px solid red",
        "background-color": "white",
        "color"           : "red",
        "padding"         : "10px",
        "font-family"     : "Arial, Helvetica, sans-serif",
        "font-size"       : "36px",
        "font-weight"     : "normal",
        "font-variant"    : "normal",
        "font-style"      : "normal",
        "line-height"     : "50px",
        "text-align"      : "center",
        "display"         : "none",
        "z-index"         :  5
    })
    warning_box.appendChild(document.createTextNode("Disconnected"))
    error_message_div = create_element("div", {
        "color"           : "black",
        "font-size"       : "12px",
        "line-height"     : "15px",
        "border"          : "2px dotted red",
        "margin-bottom"   : "10px"
    })
    warning_box.appendChild(error_message_div)
    var buttons_div = create_element("div", {
        "color"           : "black",
        "font-size"       : "12px",
        "line-height"     : "15px"
    })
    var reconnect_button = create_element("span", {
        "border"          : "1px solid gray",
        "margin-right"    : "10px",
        "padding"         : "3px",
        "cursor"          : "pointer"
    })
    reconnect_button.appendChild(document.createTextNode("reconnect"))
    reconnect_button.onclick = function(){
        remove_all_users()
        nickname_span.innerHTML = ""
        messages_div.innerHTML = ""
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        mask_ctx.clearRect(0, 0, canvas.width, canvas.height)
        mask_lines = new Array()
        set_error_message("")
        warning_box.style.display = "none"
        create_socket()
    }
    buttons_div.appendChild(reconnect_button)
    var close_button = create_element("span", {
        "border"          : "1px solid gray",
        "margin-left"     : "10px",
        "padding"         : "3px",
        "cursor"          : "pointer"
    })
    close_button.appendChild(document.createTextNode("close"))
    close_button.onclick = destroy
    buttons_div.appendChild(close_button)
    warning_box.appendChild(buttons_div)
    document.body.appendChild(warning_box)
}

function set_error_message(msg){
    while (error_message_div.childNodes.length){
        error_message_div.removeChild(error_message_div.firstChild)
    }
    error_message_div.appendChild(document.createTextNode(msg))
}

function set_loading_on(){
	loading_box.style.display = "block"
}

function set_loading_off(){
	loading_box.style.display = "none"
}

function create_chat_window(){
    var nickname_p = create_element("p", {
        "margin"     : "0",
        "margin-top" : "10px",
        "text-indent": 0
    })
    var choose_div = create_element("div", {
        "float"        : "left",
        "cursor"       : "pointer",
        "width"        : "45px",
        "padding"      : "5px",
        "margin"       : "10px 0",
        "border"       : "solid 1px #999",
        "border-radius": "5px",
        "background"   : "linear-gradient(#ffffff 58%, #b2b2b2 98%)"
    })
    var icon_div = create_element("div", {
        "float"     : "left",
        "position"  : "absolute",
        "top"       : "44px",
        "left"      : "150px",
        "height"    : "40px",
        "width"     : "60px",
        "background": "url(http://" + DOMAIN + ":" + HTTP_PORT + "/static/buddy.png) no-repeat scroll 6px 6px transparent"
    })
    var input = create_element("input", {
        "width"           : "100%",
        "background-color": "#f7f7f7"
    })
    chat_div = create_element("div", {
        "position"        : "fixed",
        "top"             : "0px",
        "right"           : "0px",
        "width"           : "200px",
        "height"          : "100%",
        "border"          : "2px solid #000000",
        "background-color": "white",
        "padding"         : "10px",
        "font-family"     : "Arial, Helvetica, sans-serif",
        "font-size"       : "12px",
        "font-weight"     : "normal",
        "font-variant"    : "normal",
        "text-align"      : "left",
        "font-style"      : "normal",
        "line-height"     : "16px",
        "z-index"         : 3,
        "overflow-y"      : "auto",
        "overflow-x"      : "hidden",
        "word-wrap"       : "break-word",
        "display"         : "block"
    })
    nickname_p.appendChild(document.createTextNode("Nickname : "))
    nickname_span = create_element("span", {"font-weight": "bold"})
    nickname_p.appendChild(nickname_span)
    chat_div.appendChild(nickname_p)
    choose_div.appendChild(document.createTextNode("Change"))
    choose_div.onclick = function(){
        send_change_nickname(prompt("Enter your new nickname (" + MAX_NICKNAME_LENGTH + " characters max):", ""))
    }
    chat_div.appendChild(choose_div)
    chat_div.appendChild(icon_div)
    input.onkeyup = function(event){
        if (event.keyCode == 13){
            send_chat_message(input.value)
            input.value = ""
        }
    }
    chat_div.appendChild(input)
    messages_div = create_element("div")
    chat_div.appendChild(messages_div)
    document.body.appendChild(chat_div)
}

function format_time(timestamp){
    return (new Date(timestamp * 1000)).toLocaleString()
}

function add_chat_message(username, msg, timestamp){
    var p = create_element("p", {"margin-top": "10px", "text-indent": 0})
    var span = create_element("span", {"font-weight": "bold"})
    span.appendChild(document.createTextNode(username))
    p.appendChild(span)
    p.appendChild(document.createTextNode(" : " + msg))
    add_message(p, timestamp)
}

function add_chat_notification(msg, timestamp){
    var p = create_element(
        "p", {"font-style": "italic", "margin-top": "10px", "text-indent": 0}
    )
    p.appendChild(document.createTextNode(msg))
    add_message(p, timestamp)
}

function add_message(msg, timestamp){
    msg.title = format_time(timestamp)
    if (messages_div.firstChild == null){
        messages_div.appendChild(msg)
    }else{
        messages_div.insertBefore(msg, messages_div.firstChild)
    }
}

function mask_push(line){
    line.push(mask_ctx)
    mask_lines.push(line)
    lines_to_draw.push(line)
}

function mask_shift(){
    mask_lines.shift()
    mask_dirty = true
}

function select_color(context, use_pen, red, green, blue){
    if (!use_pen){ // not use_pen: use eraser
        context.globalCompositeOperation = "destination-out"
    }else{
        context.globalCompositeOperation = "source-over"
        context.strokeStyle = "rgb(" + red + "," + green + "," + blue + ")"
    }
}

function line(context, x1, y1, x2, y2){
    context.beginPath()
    context.moveTo(x1, y1)
    context.lineTo(x2, y2)
    context.stroke()
}

function draw_line(x1, y1, x2, y2, duration, red, green, blue, use_pen, context){
    if (duration <= 0){
        return
    }
    var d = distance(x1, y1, x2, y2)
    if (d <= 0){
        return
    }
    var speed = d / duration
    select_color(context, use_pen, red, green, blue)
    context.lineWidth = 1 / (1.3 + (3 * speed))
    line(context, x1, y1, x2, y2)
}

function copy_img_in_canvas(blob_id){
    var img = new Image()
    img.onload = function(){
        ctx.drawImage(img, 0, 0)
    }
    img.src = blob_id
}

function draw_delta(lines){
    if (lines) {
        lines.forEach(function(line){draw_line.apply(this, line.concat([ctx]))})
    }
}

function load_image(url){
    var request = new XMLHttpRequest()
    request.onprogress = updateProgressBar
    request.onload = showImage
    request.onloadend = set_loading_off
    request.open("GET", url, true)
    request.responseType = 'arraybuffer'
    request.send(null)

    function updateProgressBar(e){
        if (e.lengthComputable)
            progress_bar.value = e.loaded / e.total * 100
    }

    function showImage(){
        if ((document.location == "about:blank") && (/firefox/i.test(navigator.userAgent))){
            // in firefox an image with src = "blob:..." won't work if location is about:blank
            copy_img_in_canvas(url)
        }else{
            var blob = new Blob([new Uint8Array(request.response)], {"type": "image/png"})
            copy_img_in_canvas((window.URL||window.webkitURL).createObjectURL(blob))
        }
    }
}

function display_chat_log(messages) {
    if (messages == null) return
    messages.forEach(function(message){
        if (message[0] == "") {
            add_chat_notification(message[1], message[2])
        } else {
            add_chat_message(message[0], message[1], message[2])
        }
    })
}

function put_embeds_down(){
    // dirty hack to be able to draw over youtube flash videos
    var embeds = frame.contentWindow.document.getElementsByTagName("embed")
    for (var i=0; i<embeds.length; i++){
        var embed = embeds[i]
        if ((embed.getAttribute("type") == "application/x-shockwave-flash") && (embed.getAttribute("wmode") == null)) {
            var parent = embed.parentNode
            embed.setAttribute("wmode", "opaque")
            parent.removeChild(embed)
            setTimeout(function(){parent.appendChild(embed)}, 0)
            setTimeout(function(){embed.stopVideo()}, 2000)
        }
    }
}


function unwrap_document_from_iframe(){
    document.replaceChild(
        frame.contentWindow.document.documentElement,
        document.documentElement
    )
}

function doctype_to_string(d){
    return "<!DOCTYPE "
         + d.name
         + (d.publicId ? ' PUBLIC "' + d.publicId + '"' : '')
         + (!d.publicId && d.systemId ? ' SYSTEM' : '')
         + (d.systemId ? ' "' + d.systemId + '"' : '')
         + '>'
}

function wrap_document_in_iframe(){
    var height = Math.max(document.documentElement.scrollHeight, HEIGHT)
    var doctype = document.doctype
    var documentElement
    if ((document.contentType !== undefined) && (document.contentType.startsWith("image/"))) {
        // Firefox image workaround: remove all html it adds around the image
        documentElement = create_element("body", {"margin": "0px"})
        var img = create_element("img")
        img.src = document.location
        documentElement.appendChild(img)
    } else {
        documentElement = document.documentElement.cloneNode(true)  // clone page
        documentElement.removeChild(documentElement.lastChild)  // remove this script
    }
    var doc = document.createElement('html')
    doc.appendChild(document.createElement('body'))
    document.replaceChild(doc, document.documentElement)  // replace this page with a new one
    frame_div = create_element("div", {
        "position": "relative",
        "width"   : WIDTH + "px",
        "margin"  : "auto",
        "transform-origin": "0 0",
        "-webkit-transform-origin": "0 0"
    })
    frame = create_element("iframe", {
        "width"   : "100%",
        "height"  : height + "px",
        "overflow": "hidden",
        "border"  : 0
    })
    frame.onload = function(){
        if (doctype){
            frame.contentWindow.document.open()
            frame.contentWindow.document.write(doctype_to_string(doctype))
            frame.contentWindow.document.close()
        }
        frame.contentWindow.document.replaceChild(
            documentElement,
            frame.contentWindow.document.documentElement
        )
        put_embeds_down()
    }
    frame_div.appendChild(frame)
    document.body.appendChild(frame_div)
}
