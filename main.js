var wordbits;
var bankbits;
var giveups;
var secretWord;
var guesses
var minlength;
var maxlength;
var settings;
var timeRemaining;
var bonusTimeText;
var paused;
var victories;
var failures;
var pauseText;
var queuedFunction;
var bonusScored;
var bonusReceived;
var topScores;

// TODO
//
// Fix formatting on mobile
// Improve word frequency sorting

function randomWord(minLength, maxLength) {
    maxLength = Math.max(minLength, maxLength)
    dictionary = getSelectedDictionary()
    while (true) {
        var n = Math.floor(Math.random() * dictionary.length)
        var word = dictionary[n]
        if (word.length >= minLength && word.length <= maxLength) {
            return word
        }
    }
}

function heartbeat() {
    if (settings.useTimer && !paused) {
        timeRemaining -= 1
        if (timeRemaining <= 0) {
            fail()
            refresh()
        }
        showTime()
    }
}

function getSelectedDictionary() {
    if (settings.dictionaryName  == '10k') {
        return smallDictionary
    } else if (settings.dictionaryName == '50k') {
        return dictionary
    } else if (settings.dictionaryName == 'all') {
        return bigDictionary
    }
    console.log("didn't find dictionary with name " + settings.dictionaryName)
}

function getTimeLimit() {
    var diff =  secretWord.length - settings.minLength;
    if (settings.timeAdjustmentRule[0] == "+") {
        var adjustment = Number(settings.timeAdjustmentRule.substring(1)) * diff
        return settings.baseTimeLimit + adjustment
    } else if (settings.timeAdjustmentRule[0] == "x") {
        var multiple = Math.pow(Number(settings.timeAdjustmentRule.substring(1)), diff)
        return settings.baseTimeLimit * multiple
    } else {
        return settings.baseTimeLimit
    }
}

function randomBank() {
    secretWord = randomWord(settings.minLength, settings.maxLength)
    bankbits = secretWord.split('')
}

function scrambleBank() {
    scramble(bankbits)
}

function isWord(word) {
    return dictionarySet.has(word)
}

function scramble(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

      // Pick a remaining element...
      var randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      var temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
}

function strFromKey(e) {
    return String.fromCharCode(e.keyCode)
}

function renderWord(word) {
    return wrapWithLink(word, 'https://en.wiktionary.org/wiki/' + word.toLowerCase() + '#English')
}

function wrapWithLink(text, link) {
    return ['<a href="',
        link,
        '" target="_blank" style="text-decoration:none;color:black">',
        text,
        '</a>'].join('')
}

function renderWords(words) {
    return words.map(renderWord).join(' ')
}

function wrapWithAction(text, f) {
    return ['<a href="javascript:',f,'" style="text-decoration:none;color:black">', text, '</a>'].join('')
}

// TODO: handle escapes etc.

function renderLetter(c) {
    return wrapWithAction(c, "addLetterIfIn('" + c + "'); refresh()")
}


function refresh() {
    if (paused) {
        $('#source').html(pauseText)
        $('#source').css('font-family', 'Times New Roman')
        $('#word').html('')
    } else {
        $('#source').html(bankbits.map(renderLetter).join(''))
        $('#source').css('font-family', 'monospace')
        $('#word').html(wrapWithAction(wordbits.join(''), 'doEnter(); refresh()'))
    }

    $('#victorycount').text(victories.length)
    $('#attempts').text(failures.length + victories.length)

    $('#victories').html(renderWords(victories))
    $('#failures').html(renderWords(failures))
    $('#guesses').html(renderWords(guesses))
    showTime()
    refreshChangeWarning()
    showHighScore()
}

function showHighScore() {
    const key = hashDict(settings)
    const scoreData = topScores[key]
    if (scoreData != undefined) {
        const scoreWins = scoreData[1][0]
        const scoreFails = scoreData[1][1]
        $('#highscore').html(['Personal best:', scoreWins, '/', scoreFails + scoreWins].join(' '))
        const isTopScore = (scoreData != undefined
                            && scoreData[1][0] == victories.length
                            && scoreData[1][1] == failures.length)
        if (isTopScore) {
            $('#highscore').css('color', 'green')
        } else {
            $('#highscore').css('color', 'black')
        }
    } else {
        $('#highscore').html('')
        $('#highscore').html('')
    }
}

function deleteLetter() {
    if (wordbits.length > 0) {
        bankbits.push(wordbits.pop())
    }
}

function deleteFromFront() {
    bankbits.push(wordbits.shift())
}

function deleteAll() {
    while (wordbits.length > 0) deleteFromFront()
}

function addLetterIfIn(letter) {
    var n = bankbits.indexOf(letter)
    if (n >= 0) {
        bankbits.splice(n, 1)
        wordbits.push(letter)
    }
}

function currentWord() {
    return wordbits.join('')
}

function showTime() {
    $('#time').css('color', 'black')
    if (paused) {
        $('#time').text('')
    } else if (settings.useTimer) {
        if (timeRemaining < 10) {
            $('#time').css('color', 'red')
        }
        $('#time').text(timeRemaining)
    } else {
        $('#time').text('(off)')
    }
    if (bonusTimeText > 0) {
        $('#bonustime').text('(+' + bonusTimeText + ')')
        $('#bonustime').css('color', 'green')
    } else {
        $('#bonustime').text('')
    }
}

function winner() {
    return (bankbits.length == 0) && isWord(currentWord())
}

function fail() {
    bonusTimeText = 0
    pauseText = ["(", unpauser("It was "), renderWord(secretWord), ")"].join('')
    failures.push(secretWord)
    pauseThen(pauseText, initialize, 0.5)
}

function succeed(word) {
    bonusTimeText = 0
    victories.push(word)
    updateScores()
    pauseThen(unpauser("(Enter to start)"), initialize)
}

function getBonusTime(N) {
    const [threshold, exp] = settings.bonusTimeRules.split(",")
    return Math.pow(Math.max(0, N - threshold), exp)
}

function diluteBonus(X) {
    const L = settings.maxBonus
    if (settings.maxBonus == 0) {
        return X
    } else {
        return L * (1 - Math.exp(-X / L))
    }
}

function addBonus(N) {
    var bonusTime = getBonusTime(N)
    bonusScored += bonusTime
    var targetBonus = diluteBonus(bonusScored)
    var toReceive = Math.floor(targetBonus - bonusReceived)
    timeRemaining += toReceive
    bonusReceived += toReceive
    bonusTimeText = toReceive
    showTime()
}

function addWord() {
    if (guesses.indexOf(currentWord()) == -1) {
        guesses.push(currentWord())
        addBonus(currentWord().length)
    }
}

function isChecked(name) {
    return $('input[name='+name+']:checked').length > 0
}

function getValue(name) {
    return $('input[name='+name+']:checked').val()
}

function score(successes, failures) {
    const m = (successes + 2) / (successes + failures + 4)
    const stdev = Math.sqrt(m * (1-m) / (successes + failures + 4))
    return m - 2 * stdev
}

// TODO: add tooltips

function hashDict(dict) {
    var x = Object.entries(dict)
    x.sort()
    return hashString(x.flat().join(';'))
}

function updateScores() {
    const newScore = score(victories.length, failures.length)
    const key = hashDict(settings)
    oldScore = topScores[key]
    if (oldScore == undefined || newScore > oldScore[0]) {
        topScores[key] = [newScore, [victories.length, failures.length]]
        setCookie('topScores', topScores)
    }
}

function hashString(s){
    var hash = 0;
    if (s.length == 0) return hash;
    for (i = 0; i < s.length; i++) {
        char = s.charCodeAt(i);
        hash = ((hash<<5)-hash)+char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

var defaultSettings = {
    timeAdjustmentRule: '+15',
    useTimer: true,
    allowPausing: false,
    baseTimeLimit: 30,
    minLength: 6,
    maxLength: 8,
    dictionaryName: '50k',
    bonusTimeRules: '2,1',
    maxBonus: 0,
}

var longSettings = {
    timeAdjustmentRule: '+30',
    useTimer: true,
    allowPausing: false,
    baseTimeLimit: 60,
    minLength: 9,
    maxLength: 10,
    dictionaryName: '50k',
    bonusTimeRules: '2,1',
    maxBonus: 0,
}

var quickSettings = {
    timeAdjustmentRule: '+0',
    useTimer: true,
    allowPausing: false,
    baseTimeLimit: 15,
    minLength: 6,
    maxLength: 7,
    dictionaryName: '50k',
    bonusTimeRules: '3,2',
    maxBonus: 45,
}

var franticSettings = {
    timeAdjustmentRule: '+0',
    useTimer: true,
    allowPausing: false,
    baseTimeLimit: 15,
    minLength: 8,
    maxLength: 9,
    dictionaryName: '50k',
    bonusTimeRules: '3,2',
    maxBonus: 90,
}

function settingsFromUI() {
    return {
        timeAdjustmentRule: getValue('timeadjustment'),
        useTimer: isChecked('usetimer'),
        allowPausing: isChecked('allowpausing'),
        baseTimeLimit : Number(getValue('timelimit')),
        minLength : Number(getValue('minlength')),
        maxLength : Number(getValue('maxlength')),
        dictionaryName : getValue('dictionary'),
        bonusTimeRules: getValue('timeaddition'),
        maxBonus: Number(getValue('maxbonus')),
    }
}

function checkIf(name, test) {
    var elem = $('input[name='+name+']')
    if (test) {
        elem.attr('checked', 'checked')
    } else {
        elem.attr('checked', '')
    }
}

function setTo(name, value) {
    $('input[name='+name+'][value='+value+']').attr('checked', 'checked')
}

function settingsToUI(settings) {
    setTo('timeadjustment', settings.timeAdjustmentRule)
    checkIf('usetimer', settings.useTimer)
    checkIf('allowpausing', settings.allowPausing)
    setTo('timelimit', settings.baseTimeLimit)
    setTo('minlength', settings.minLength)
    setTo('maxlength', settings.maxLength)
    setTo('dictionary', settings.dictionaryName)
    setTo('timeaddition', settings.bonusTimeRules)
    setTo('maxbonus', settings.maxBonus)
}

function setSettings(newSettings) {
    settings = newSettings
    settingsToCookie(settings)
    settingsToUI(settings)
}

function unpauser(text) {
    return wrapWithAction(text, 'unpause(); refresh()')
}

function reset(){
    victories = []
    failures = []
    guesses = []
    pauseThen(unpauser("(Enter to start)"), initialize)
}

function initialize() {
    wordbits = []
    randomBank()
    scrambleBank()
    guesses = []
    bonusScored = 0
    bonusReceived = 0
    timeRemaining = getTimeLimit()
    refresh()
}

function equalValues(obj1, obj2) {
    var props1 = Object.getOwnPropertyNames(obj1)
    var props2 = Object.getOwnPropertyNames(obj2)
    if (props1.length != props2.length) {
        console.log("Comparing objects with different keys")
        return false
    }
    return props1.every(name => obj1[name] == obj2[name])
}

function setCookie(name,value) {
    document.cookie = name + "=" + (JSON.stringify(value) || "")  + "; path=/";
}
function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return JSON.parse(c.substring(nameEQ.length,c.length));
    }
    return null;
}
function settingsFromCookie() {
    var loaded = getCookie('settings')
    var result = {}
    Object.assign(result, defaultSettings)
    if (loaded != null) {
        Object.assign(result, loaded)
    }
    return result
}
 
function settingsToCookie(settings) {
    setCookie('settings', settings)
}

function time() {
    return Date.now() / 1000;
}

function pauseThen(text, f, delay) {
    if (delay == undefined) {
        waitUntil = time()
    } else {
        waitUntil = time() + delay
    }
    bonusTimeText = 0
    paused = true
    pauseTime = 
    pauseText = text
    queuedFunction = f
    refresh()
}

function unpause() {
    if (time() >= waitUntil) {
        paused = false
        queuedFunction()
        refresh()
    } else {
        waitUntil = time()
    }
}

function doEnter() {
    if (winner()) {
        succeed(currentWord())
    } else if (isWord(currentWord())) {
        addWord(currentWord())
        deleteAll()
    } else {
        deleteAll()
    }
}

function refreshChangeWarning() {
    if (!equalValues(settings, settingsFromUI())) {
        $('#changewarning').text("Press button to apply changes")
    } else {
        $('#changewarning').text("")
    }
}

function loadScores() {
    const scoreFromCookie = getCookie('topScores')
    if (scoreFromCookie == null) {
        return {}
    } else {
        return scoreFromCookie
    }
}

function load() {
    setSettings(settingsFromCookie())
    setInterval(heartbeat, 1000)
    topScores = loadScores()
    reset()
    $(document).click(e => {
        refreshChangeWarning()
    })
    $(document).keydown(e => {
        bonusTimeText = 0
        if (paused) {
            if (e.keyCode == 13 || e.keyCode == 186) {
                unpause()
            }
        } else if (e.keyCode == 186 && settings.allowPausing){
            pauseThen("(Enter to resume)", pass)
        } else if (e.keyCode == 13){
            doEnter()
        } else if (e.keyCode == 8) {
            deleteLetter()
        } else if (e.keyCode == 32) {
            scrambleBank()
            e.preventDefault()
        } else if (e.keyCode == 27) {
            fail()
        } else {
            addLetterIfIn(strFromKey(e))
        }
        refresh()
    })
}

