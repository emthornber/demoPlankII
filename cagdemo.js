// -------------------------------------------
// CANWEB Scripts
// -------------------------------------------
// 13-Apr-19 Generalised setobject
// 21-Aug-14 Added support for sequencer
// 12-Jun-14 Added support for loco images
// 10-Jun-14 Added reload, tidied up file
//  7-Jun-14 Added sendonevent/sendoffevent + intermediate change
//  4-Jun-14 Allow exxxa and exxxb events
//  3-Jun-14 Improvements when 0 or 1 locos available
//  2-Jun-14 Simulate button changed
// 30-May-14 Changes for stop/emergency stop

// -------------------------------------------
// Global variables
var commsonline;                         // True if comms online
var stopdir = true;                      // Stop before changing direction
var systext;                             // System text
var syshide;                             // Initially hide system text
var socketopen = false;                  // Socket not initially open
var websocket;                           // Websocket
var simmode = false;                     // Set initial simulation mode
var title = "";                          // Layout title
var datefmt = "hh:mm d nnn yyyy";        // Date/Time format
var maxrows = 7;                         // Max rows for selection box
var maxfunc = 10;                        // Maximum number of function keys
// -------------------------------------------
// Layout Control functions called from html page
// -------------------------------------------
// Send ON event
// 'sc' is event number
// If 'but' defined, sets that object to '2'
function sendonevent(sc, but) {
    sendevent(sc, '1', but);
}

// -------------------------------------------
// Send OFF event
// 'sc' is event number
// If 'but' defined, sets that object to '2'
function sendoffevent(sc, but) {
    sendevent(sc, '0', but);
}

// -------------------------------------------
// Send ON or OFF event
// 'sc' is event number
// 'state' is '0' or '1'
// If 'but' defined, sets that object to '2'
function sendevent(sc, state, but) {
    if (sc != undefined && state != undefined) {
        if (commsonline) {
            if (state == '1')
                sendmessage('E' + sc);
            else
                sendmessage('e' + sc);
            if (but != undefined) {
                setimage('e' + but, '2');
            }
        } else {
            systext.addtext('red', "Offline");
        }
    }
}

// -------------------------------------------
// Send command to toggle state
// 'set' is event number
// 'read' is optional event to read current state
function sendtoggle(set, read) {
    if (set != undefined) {
        if (commsonline) {
            if (read == undefined)
                read = set;
            var state = !getobject("e" + read);
            if (state)
                sendmessage("E" + set);
            else
                sendmessage("e" + set);
            setobject('e', set, state);
        } else {
            systext.addtext('red', "Offline: " + sc);
        }
    }
}

// -------------------------------------------
// Send command to toggle state if in simulation mode
// 'set' is event number
// 'read' is optional event to read current state
function simtoggle(set, read) {
    if (simmode) {
        sendtoggle(set, read);
    }
}

// -------------------------------------------
// Process Simulate Button
function simbutton() {
    if (socketopen) {
        var state = !getobject("a0");
        if (state)
            sendmessage("A0");
        else
            sendmessage("a0");
        setobject('a', '0', state);
        simmode = state;         // Update our store
    }
}

// -------------------------------------------
// Process Aux Button Toggle
function auxtoggle(set) {
    if (commsonline) {
        var state = !getobject("a" + set);
        if (state)
            sendmessage("A" + set);
        else
            sendmessage("a" + set);
        setobject('a', set, state);
    }
}

// -------------------------------------------
// Process Aux Button Set
function auxbutton(id) {
    if (commsonline) {
        sendmessage("A" + id);
    }
}

// -------------------------------------------
// Process Status Area Click
function statusclick() {
    if (socketopen) {
        systext.changedisplay();
    } else {
        location.reload();
    }
}

// -------------------------------------------
// Throttle Control functions called from html page
// -------------------------------------------
// Loco selection box clicked by browser
function locoselectclick(id) {
    if (commsonline) {
        if (islocoused(id) && locorunning(id)) {
            clearstop(id);
            overlaysetup("X" + id, "Release loco?");
        } else {
            sendmessage("L" + id);
        }
    }
}

// -------------------------------------------
// Loco Direction button clicked by browser
function locodirectionclick(id) {
    if (commsonline) {
        clearstop(id);
        if (stopdir && locorunning(id))  // Go through stop?
        {
            locospeedchange(id, 0);          // Tell webserver
            setlocospeed(id, 0);             // Set slider to zero
        } else {
            locofuncclick(id + '29');
        }
    } else {
        systext.addtext('red', "Offline: " + sc);
    }
}

// -------------------------------------------
// Loco Speed changed by browser
function locospeedchange(id, v) {
    if (v != undefined) {
        if (v == 0 || !locorunning(id))
            clearstop(id);
        var last = document.getElementById("lspd" + id);
        if (v != last.innerHTML) {
            last.innerHTML = v;
            sendmessage("P" + id + v);
        }
    }
}

// -------------------------------------------
// Loco Stop button clicked by browser
function locostopclick(id) {
    setobject('a', '1', false);       // Clear emergency stop
    locofuncclick(id + '30');
}

// -------------------------------------------
// Loco Function button clicked by browser
function locofuncclick(ref) {
    if (ref != undefined) {
        if (commsonline) {
            var state = !getobject("f" + ref);
            if (state)
                sendmessage("F" + ref);
            else
                sendmessage("f" + ref);
            setobject('f', ref, state);
        } else {
            systext.addtext('red', "Offline: " + sc);
        }
    }
}

// -------------------------------------------
// Loco functions
// -------------------------------------------
// Setup Loco
function setuploco(id, parms) {
    var name;
    var image;
    var locoaddr;
    clearstop(id);
    if (parms == undefined || parms[1] == 0) {
        name = "Select Loco";
        locoaddr = 0;
    } else {
        locoaddr = parms[0];      // Loco address
        var locoparms = parms[1].split("|");
        if (locoparms.length > 1) {
            name = locoparms[0];     // Loco name
            image = locoparms[1];    // Loco image
        } else {
            name = parms[1];          // Loco name
        }
    }
    elem = document.getElementById("addr" + id);
    if (locoaddr > 0) {
        elem.innerHTML = '<tt>' + locoaddr + '</tt>';
        elem = document.getElementById("speed" + id);
        elem.max = parms[2];
    } else {
        elem.innerHTML = "";
    }
    var elem = document.getElementById("loco" + id);
    if (elem != undefined) {
        elem.innerHTML = name;
    }
    var eimg = document.getElementById("loci" + id);
    if (eimg != undefined) {
        if (image == undefined) {
            eimg.src = "loco_none.png";
        } else {
            eimg.src = image + ".png";
        }
    }
    for (n = 0; n <= maxfunc - 1; ++n) {
        var butn = document.getElementById("b" + id + n);
        var elem = document.getElementById("t" + id + n);
        if (parms != undefined && parms.length > n + 3)  // Got a function?
        {
            setobject('f', n.toString(), false);
            if (elem != undefined) {
                elem.innerHTML = parms[n + 3];
            }
            if (butn != undefined) {
                butn.style.visibility = "visible";
            }
        } else {
            if (butn != undefined) {
                butn.style.visibility = "hidden";
            }
        }
    }
    setobject('f', id + '29', false);
    if (locoaddr > 0) {
        document.getElementById("b" + id + "29").style.visibility = "visible";
        document.getElementById("b" + id + "31").style.visibility = "visible";
        document.getElementById("b" + id + "30").style.visibility = "visible";
    } else {
        document.getElementById("b" + id + "29").style.visibility = "hidden";
        document.getElementById("b" + id + "31").style.visibility = "hidden";
        document.getElementById("b" + id + "30").style.visibility = "hidden";
    }
    if (locoaddr > 0) {
        document.getElementById("addr" + id).style.visibility = "visible";
    } else {
        document.getElementById("addr" + id).style.visibility = "hidden";
    }
    setlocospeed(id, 0);
}

// -------------------------------------------
// Clear stop buttons
function clearstop(id) {
    setobject('a', '1', false);   // Clear emergency stop
    setobject('f', id + '30', false);  // Clear loco stop
}

// -------------------------------------------
// Return true if loco in use
function islocoused(id) {
    var used = false;
    var elem = document.getElementById("addr" + id);
    if (elem != undefined) {
        if (elem.innerHTML.indexOf("tt") >= 0)
            used = true;
    }
    return used;
}

// -------------------------------------------
// Set displayed loco speed
function setlocospeed(id, v) {
    var elem = document.getElementById("speed" + id);
    elem.value = v;
    elem = document.getElementById("lspd" + id);
    elem.innerHTML = v;
}

// -------------------------------------------
// Return true if loco running
function locorunning(id) {
    var elem = document.getElementById("speed" + id);
    return elem.value > 0;
}

// -------------------------------------------
// Start background timer
window.setInterval(function () {
    background()
}, 5000);
// -------------------------------------------
// Process stuff when web page loads
window.onload = function () {
    commsonline = false;
    if (syshide)
        systext.hidetext();
    var url = 'ws://' + location.host + '/ws';
    websocket = new WebSocket(url);
    websocket.onopen = function (ev) {
        socketopen = true;
        systext.addtext('red', 'Connected');
        sendmessage('VLOFT V1.03 21-Apr-14');
        sendmessage('T' + datefmt);
    }
    websocket.onclose = function (ev) {
        systext.addtext('red', 'Disconnected');
        statustext('red', 'DISCONNECTED - Press to Reload');
        commsonline = false;
        socketopen = false;
        websocket.close();
        overlayclick();
        setuploco('x');
        setuploco('y');
        setuploco('z');
        setuploco('w');
    }
    websocket.onmessage = function (ev) {
        if (ev.data.length > 0) {
            var id, p1, p2;
            if (ev.data.length > 1) {
                id = ev.data[1];
                p1 = ev.data.substr(1);
                if (ev.data.length > 2) {
                    p2 = ev.data.substr(2);
                } else {
                    p2 = "?";
                }
            } else {
                id = '?';
            }
            var err;

            systext.addtext('blue', ev.data.substr(0, 200));
            switch (ev.data[0]) {
                case 'E':    // Event On
                    setobject('e', p1, true);
                    break;
                case 'e':    // Event Off
                    setobject('e', p1, false);
                    break;
                case 'F':   // Function On
                    setobject('f', p1, true);
                    break;
                case 'f':   // Function Off
                    setobject('f', p1, false);
                    break;
                case 'A':   // Aux On
                    auxcommand(p1, true);
                    break;
                case 'a':   // Aux Off
                    auxcommand(p1, false);
                    break;
                case 'V':  // Software Version
                    if (p1.length >= 1)
                        document.getElementById('sysvers').innerHTML = p1;
                    break;
                case 'T':  // Time & Date
                    if (commsonline)
                        statustext('black', title + p1);
                    break;
                case 'L':  // Loco information
                    clearstop(id);
                    if (p2 == '?')
                        p2 = "";
                    overlaysetup("C" + id, p2);
                    break;
                case 'C':  // Loco Choice
                    parms = p2.split(",");   // Split on commas
                    setuploco(id, parms);
                    break;
                case 'K':  // Loco Taken
                    clearstop(id);
                    overlaysetup("C" + id + p2 + ",", "Steal Loco?,Share Loco?");
                    break;
                case 'R':  // Release Session
                    setuploco(id);
                    break;
                case 'P':  // Loco Speed
                    setlocospeed(id, p2);
                    break;
                case 'N':  // Message Number
                    messagenumber(p1);
                    break;
                case 'M':  // Message
                    messagetext(p1);
                    break;
                case 'X':  // File Transfer
                    filetransfer(p1);
                    break;
                default:
                    break;
            }
        }
    }
    websocket.onerror = function (ev) {
        systext.addtext('red', 'ERROR: ' + ev.data);
        statustext('red', 'ERROR: ' + ev.data);
        commsonline = false;
    }
}
// -------------------------------------------
// Process file transfer command received
function filetransfer(cmd) {
    if (cmd.length) {
        switch (cmd[0]) {
            case 'R':   // Read
                var text = cmd.substr(1);
                var obj = JSON.parse(text);
                var jsonString = JSON.stringify(obj);
                sendmessage('XWtestreadcheck,' + jsonString);
                break;
            case 'L':   // List
                break;
            case 'W':   // Write
                break;
        }
    }
}

// -------------------------------------------
// Send file transfer command
function sendfiletransfer(cmd) {
    if (cmd.length) {
        switch (cmd[0]) {
            case 'R':   // Read
                sendmessage('X' + cmd);
                break;
            case 'L':   // List
                sendmessage('XL');
                break;
            case 'W':   // Write
                var myObject =
                    {
                        aNumber: 123,
                        someText: 'hello world!',
                        truthy: false
                    };
                var jsonString = JSON.stringify(myObject);
                sendmessage('X' + cmd + ',' + jsonString);
                break;
        }
    }
}

// -------------------------------------------
// Called every so often to keep link alive
function background() {
    if (socketopen) {
        websocket.send("h");
    }
}

// -------------------------------------------
// Send a message to the web server
function sendmessage(msg) {
    if (socketopen) {
        systext.addtext('green', msg.substr(0, 200));
        websocket.send(msg);
    }
}

// -------------------------------------------
// Process aux command from webserver
function auxcommand(parm, state) {
    switch (parm) {
        case '0':         // Simulation Mode
            simmode = state;
            break;
        case '2':         // Layout Mode
            commsonline = state;
            if (!state) {
                statustext('red', 'Layout Offline');
            }
            break;
    }
    setobject('a', parm, state);
}

// -------------------------------------------
// Set an object with id '<pfx><text>' to a state.
// Changes the source image to 'xxx0.xxx' or 'xxx1.xxx'
// Also updates id '<pfx><text>a' .. '<pfx><text>z'
// if they exist
function setobject(pfx, txt, on) {
    if (txt.length) {
        var name = pfx + txt;
        var sfx = on ? '1' : '0';
        setimage(name, sfx);
        var code = 'a'.charCodeAt(0);
        while (setimage(name + String.fromCharCode(code++), sfx)) {
        }
    }
}

// -------------------------------------------
// Set image to suffix specified
// Returns NULL if image does not exist
function setimage(name, sfx) {
    var elem = document.getElementById(name);
    if (elem != undefined) {
        var n = elem.src.lastIndexOf(".");
        if (n > 1) {
            var src = elem.src.substr(0, n - 1) + sfx + elem.src.substr(n);
            elem.src = src;
        }
    }
    return elem;
}

// -------------------------------------------
// Get state of an object with id '<name>'
function getobject(name) {
    var state = false;
    if (name != undefined) {
        var elem = document.getElementById(name);
        if (elem != undefined) {
            var n = elem.src.lastIndexOf(".");
            if (n > 1) {
                if (elem.src.charAt(n-1) != '0') {
                    state = true;
                }
            }
        }
    }
    return state;
}

// -------------------------------------------
// Display short text in status box
function statustext(colour, msg) {
    var e = document.getElementById("status");
    if (colour.length) {
        e.innerHTML = '<span style="color: ' + colour + '; ">' + msg + ' </span>';
    } else {
        e.innerHTML = msg;
    }
}

// -------------------------------------------
// Display message number
function messagenumber(num) {
    var e = document.getElementById("number");
    if (e != undefined) {
        if (num != undefined) {
            e.innerHTML = num;
            e.style.display = "inline";
        } else {
            e.style.display = "none";
        }
    }
}

// -------------------------------------------
// Display message text
function messagetext(msg) {
    var e = document.getElementById("message");
    var eb = document.getElementById("msgbox");
    if (e != undefined) {
        if (msg != undefined) {
            var prefix = false;
            var txt = "";
            var n;
            for (n = 0; n < msg.length; ++n) {
                var c = msg[n];
                if (prefix) {
                    prefix = false;
                    switch (c) {
                        case '~':
                            txt += c;
                            break;
                        case '_':
                            txt += "<br>";
                            break; // Newline
                        case 'B':
                            txt += "<b>";
                            break; // Bold On
                        case 'b':
                            txt += "</b>";
                            break; // Bold Off
                        case 'I':
                            txt += "<i>";
                            break; // Italic On
                        case 'i':
                            txt += "</i>";
                            break; // Italic Off
                        case 'U':
                            txt += "<u>";
                            break; // Underline On
                        case 'u':
                            txt += "</u>";
                            break; // Underline Off
                        case 'H':
                            txt += "<del>";
                            break;// Deleted (Strikethrough) On
                        case 'h':
                            txt += "</del>";
                            break;// Deleted (Strikethrough) Off
                        case 'a':
                            txt += '<font color="aqua">';
                            break;
                        case 'k':
                            txt += '</font>';
                            break; // Black
                        case 'e':
                            txt += '<font color="blue">';
                            break;
                        case 'f':
                            txt += '<font color="fuchsia">';
                            break;
                        case 'g':
                            txt += '<font color="green">';
                            break;
                        case 'd':
                            txt += '<font color="gray">';
                            break;
                        case 'l':
                            txt += '<font color="lime">';
                            break;
                        case 'm':
                            txt += '<font color="maroon">';
                            break;
                        case 'n':
                            txt += '<font color="navy">';
                            break;
                        case 'o':
                            txt += '<font color="darkorange">';
                            break;
                        case 'p':
                            txt += '<font color="purple">';
                            break;
                        case 'r':
                            txt += '<font color="red">';
                            break;
                        case 's':
                            txt += '<font color="silver">';
                            break;
                        case 't':
                            txt += '<font color="teal">';
                            break;
                        case 'w':
                            txt += '<font color="white">';
                            break;
                        case 'y':
                            txt += '<font color="yellow">';
                            break;
                    }
                } else if (c == '~') {
                    prefix = true;
                } else {
                    txt += c;
                }
            }
            e.innerHTML = txt;
            eb.style.display = "inline";
        } else {
            eb.style.display = "none";
        }
    }
}

// -------------------------------------------
// Setup overlay screen
// pfx is prefix for click names (pfx0...pfxn)
// parm is comma seperated list of options
function overlaysetup(pfx, parm) {
    var elem = document.getElementById("overlay");
    if (elem != undefined) {
        var parms;
        parms = parm.split(",");     // Split on commas
        if (parms.length == 1 && parms[0] == "")
            parms.pop();
        var none = (pfx[0] == "C" && pfx.length == 2 && islocoused(pfx[1])); // Add 'none' button
        if (none)
            parms.push("None");
        parms.push("Cancel");         // Add a cancel button
        // Display Overlay
        elem.style.display = "inline";
        elem.innerHTML = "";          // Clear
        var table = document.createElement("table");
        var rows, cols, i, r, c;
        if (parms.length < maxrows) {
            rows = parms.length;
        } else {
            rows = 1 + Math.sqrt(parms.length);
            if (rows > maxrows)
                rows = maxrows;
            rows = parseInt(rows);
        }
        // Horrible bodge to vaguely centre table
        i = (maxrows - rows) / 2;
        if (i >= 1) {
            for (r = 0; r < 5 * i; ++r) {
                tr = document.createElement("tr");
                table.appendChild(tr);
            }
        }
        cols = (parms.length + rows - 1) / rows;
        for (r = 0; r < rows; ++r) {
            tr = document.createElement("tr");
            table.appendChild(tr);
            for (c = 0; c < cols; ++c) {
                i = c * rows + r;
                if (i < parms.length) {
                    td = document.createElement("td");
                    var name;
                    var image;
                    var bparms = parms[i].split("|");
                    if (bparms.length > 1) {
                        name = bparms[0];     // Name
                        image = bparms[1];    // Image
                    } else {
                        name = parms[i];      // Name
                        image = undefined;    // No image
                    }
                    var txt = document.createTextNode(name);
                    td.appendChild(txt);
                    if (image != undefined) {
                        var isrc = document.createElement("IMG");
                        isrc.src = image + ".png";
                        td.appendChild(isrc);
                    }
                    if (none && i == (parms.length - 2))  // None button?
                    {
                        td.id = "N" + pfx[1];
                    } else {
                        td.id = pfx + i;
                    }
                    if (i < (parms.length - 1))  // Not last
                        td.onclick = function () {
                            overlayclick(this.id);
                        };
                    else
                        td.onclick = function () {
                            overlayclick();
                        };
                    table.appendChild(td);
                }
            }
        }
        elem.appendChild(table);
    }
}

// -------------------------------------------
// Overlay click. 'ref' is id of element clicked
function overlayclick(ref) {
    // Hide Overlay
    var elem = document.getElementById("overlay");
    if (elem != undefined)
        elem.style.display = "none";
    // Now send appropriate command
    if (ref != undefined) {
        var p = ref.substr(1);
        var id = ref[1];
        if (ref[0] == 'X')     // Release/Dispatch?
        {
            sendmessage("C" + id);
            setuploco(id);
            sendmessage("L" + id);
        } else if (ref[0] == 'N') // None selected?
        {
            sendmessage("C" + p); // Release loco
            setuploco(id);
        } else {
            sendmessage(ref);
        }
    }
}

// -------------------------------------------
// Storage and processing for scrolling text window
// 'elem' is html element to display text
// 'maxl' is maximum lines to store/display
function scrolltext(elem, maxl) {
    this.lines = new Array();
    this.maxl = maxl;
    this.elem = elem;
    this.addtext = addtext;
    this.display = display;
    this.displaytext = displaytext;
    this.hidetext = hidetext;
    this.changedisplay = changedisplay;

// Add a line of text
    function addtext(colour, msg) {
        while (this.lines.length >= this.maxl) {
            this.lines.shift();   // Delete oldest
        }
        if (colour.length) {
            this.lines.push('<span style="color: ' + colour + '; ">' + msg + ' </span>');
        } else {
            this.lines.push(msg);  // Add to end
        }
        this.display();      // Redisplay
    }

    // Display the array
    function display() {
        e = document.getElementById(this.elem);
        e.innerHTML = this.lines[0];
        for (n = 1; n < this.lines.length; ++n) {
            e.innerHTML += "<br>" + this.lines[n];
        }
    }

    // Display text or not
    function displaytext() {
        document.getElementById(this.elem).style.display = "inline";
    }

    function hidetext() {
        document.getElementById(this.elem).style.display = "none";
    }

    function changedisplay() {
        var elem = document.getElementById(this.elem);
        if (elem.style.display == "none")
            elem.style.display = "inline";
        else
            elem.style.display = "none";
    }
}
