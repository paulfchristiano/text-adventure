var wordbits;
var bankbits;
var secretPair;
var confirmed;
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
var focus;

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
            fail(false)
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
    var diff = secretPair.map(x => x.length - settings.minLength).reduce((a, b) => a+b);
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
    secretPair = [randomWord(settings.minLength, settings.maxLength), randomWord(settings.minLength, settings.maxLength)]
    bankbits = secretPair.join('').split('')
}

function scrambleBank() {
    scramble(bankbits)
}

function splitWord(string) {
    for (var i = 0; i < string.length; i++) {
        if (isWord(string.slice(0, i)) && isWord(string.slice(i))) {
            return [string.slice(0, i), string.slice(i)]
        }
    }
    return null
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
    const code = e.keyCode;
    if (code >= 65 && code <= 90) {
        return String.fromCharCode(code)
    }
    return null
}

function renderPair([word1, word2]) {
    return `${renderWord(word1)}/${renderWord(word2)}`
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

function renderPairs(pairs) {
    return pairs.map(renderPair).join(' ')
}

function renderGuesses(misses) {
    return misses.map(miss => miss.join('')).map(x=>'-'+x).join(',')
}

function renderWords(words) {
    return words.map(renderWord).join(' ')
}

function wrapWithAction(text, f) {
    return ['<a href="javascript:',f,'" style="text-decoration:none;color:black">', text, '</a>'].join('')
}

// TODO: handle escapes etc.

function renderLetter(c) {
    return c
    //return wrapWithAction(c, "addLetterIfIn('" + c + "'); refresh()")
}

function renderWinRate(wins, losses) {
    var winRate = 0
    if (wins > 0) {
        winRate = wins / (wins + losses)
    }
    return [wins, ' / ', wins+losses, ' (', asPercent(winRate), ')'].join('')
}

function refresh() {
    if (paused) {
        $('#source').html(pauseText)
        $('#source').css('font-family', 'Times New Roman')
        $('#word0').html('')
        $('#word1').html('')
        $('#word0header').removeClass('selected')
        $('#word1header').removeClass('selected')
    } else {
        $('#source').html(bankbits.map(renderLetter).join(''))
        $('#source').css('font-family', 'monospace')
        $('#word0header').removeClass('selected')
        $('#word1header').removeClass('selected')
        $(['#word0header', '#word1header'][focus]).addClass('selected')
        $('#word0').html(wordbits[0].join(''))
        $('#word1').html(wordbits[1].join(''))
        z = ['#word0', '#word1']
        z.map(function(x, i) {
            $(x).removeClass('confirmed')
            if (confirmed[i]) $(x).addClass('confirmed')
        })
    }

    $('#winrate').text(renderWinRate(victories.length, failures.length))

    $('#victories').html(renderPairs(victories))
    $('#failures').html(renderPairs(failures))
    $('#guesses').html(renderGuesses(guesses))
    showTime()
    refreshChangeWarning()
    showHighScore()
}

function asPercent(x) {
    return Math.round(x*100) + '%'
}

function renderScore(wins, losses) {
    return [wins, ' / ', wins + losses, ' (> ', asPercent(score(wins, losses)), ')'].join('')
}

function showHighScore() {
    const key = hashDict(settings)
    const scoreData = topScores[key]
    if (scoreData != undefined) {
        const scoreWins = scoreData[1][0]
        const scoreFails = scoreData[1][1]
        $('#highscore').html('Personal best: ' + renderScore(scoreWins, scoreFails))
        const isTopScore = (scoreData != undefined
                            && scoreData[1][0] == victories.length
                            && scoreData[1][1] == failures.length)
        if (isTopScore) {
            $('#highscore').css('color', 'green')
            $('#scoreexplainer').html('')
        } else {
            $('#highscore').css('color', 'black')
        }
        if (victories.length > 0 || failures.length > 0) {
            $('#scoreexplainer').html('Current score: ' + renderScore(victories.length, failures.length))
        } else {
            $('#scoreexplainer').html('')
        }
    } else {
        $('#highscore').html("You haven't played with these settings before")
        $('#highscore').css('color', 'black')
        $('#scoreexplainer').html('')
    }
}

function currentWordbits() {
    return wordbits[focus]
}

function deleteLetter() {
    confirmed[focus] = false
    bits = currentWordbits()
    if (bits.length > 0) {
        bankbits.push(bits.pop())
    }
}

function deleteAll() {
    confirmed[focus] = false
    bits = currentWordbits()
    while (bits.length > 0) {
        bankbits.push(bits.shift())
    }
}

function addLetter(letter) {
    var n = bankbits.indexOf(letter)
    if (n >= 0) {
        bankbits.splice(n, 1)
        currentWordbits().push(letter)
        confirmed[focus] = false
    } else {
        console.log(`error! didn't find ${letter}`)
    }
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

function fail(gaveUp) {
    bonusTimeText = 0
    pauseText = ["(", unpauser("It was "), renderPair(secretPair), ")"].join('')
    failures.push(secretPair)
    updateScores()
    var delay = 0.5
    if (gaveUp) {
        delay = 0.0
    }
    pauseThen(pauseText, initialize, delay)
}

function succeed(pair) {
    bonusTimeText = 0
    victories.push(pair)
    updateScores()
    pauseThen(unpauser("(Enter to start)"), initialize)
}

function getBonusTime(N) {
    return Number(settings.bonusTimeRules.split(',')[N-1])
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
    toReceive = bonusTime
    //console.log(bonusTime)
    //console.log(bonusScored)
    //bonusScored += bonusTime
    //var targetBonus = diluteBonus(bonusScored)
    //var toReceive = Math.floor(targetBonus - bonusReceived)
    //bonusReceived += toReceive
    timeRemaining += toReceive
    bonusTimeText = toReceive
    showTime()
}

function addPair([a, b]) {
    if (isWord(a) && isWord(b)) {
        if (bankbits.length == 0) {
            succeed([a, b])
            return
        } else if (bankbits.length <= 2) {
            const remaining = bankbits.slice()
            remaining.sort()
            for (var i = 0; i < guesses.length; i++) {
                if (guesses[i][0] == remaining[0] && (remaining.length<2 || guesses[i][1] == remaining[1])) {
                    console.log(i)
                    console.log(guesses[i])
                    console.log(remaining)
                    return
                }
            }
            guesses.push(remaining)
            addBonus(remaining.length)
        }
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
    return Math.max(m - 2 * stdev, 0)
}

// TODO: add tooltips

function hashDict(dict) {
    var x = Object.entries(dict)
    x.sort()
    return hashString(x.flat().join(';'))
}

const scoreKey = 'topScores'

function updateScores() {
    const newScore = score(victories.length, failures.length)
    const key = hashDict(settings)
    oldScore = topScores[key]
    if (oldScore == undefined || newScore > oldScore[0]) {
        topScores[key] = [newScore, [victories.length, failures.length]]
        setCookie(scoreKey, topScores)
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
    timeAdjustmentRule: '+10',
    useTimer: true,
    allowPausing: false,
    baseTimeLimit: 30,
    minLength: 5,
    maxLength: 6,
    dictionaryName: '10k',
    bonusTimeRules: '8,4',
}

var longSettings = {
    timeAdjustmentRule: '+20',
    useTimer: true,
    allowPausing: false,
    baseTimeLimit: 45,
    minLength: 6,
    maxLength: 7,
    dictionaryName: '10k',
    bonusTimeRules: '16,8',
}

var quickSettings = {
    timeAdjustmentRule: '+0',
    useTimer: true,
    allowPausing: false,
    baseTimeLimit: 15,
    minLength: 4,
    maxLength: 5,
    dictionaryName: '10k',
    bonusTimeRules: '5,0',
}

var franticSettings = {
    timeAdjustmentRule: '+0',
    useTimer: true,
    allowPausing: false,
    baseTimeLimit: 15,
    minLength: 5,
    maxLength: 7,
    dictionaryName: '50k',
    bonusTimeRules: '8,4',
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
    const input = $('input[name='+name+'][value='+value+']')
    input.attr('checked', 'checked')
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

function boldDefaultButton(settings) {
    const buttonsAndSettings = [
        [$("#button1"), defaultSettings],
        [$("#button2"), longSettings], 
        [$("#button3"), quickSettings],
        [$("#button4"), franticSettings]
    ]
    for(var i=0; i < buttonsAndSettings.length; i++) {
        const [b, s] = buttonsAndSettings[i];
        if (equalValues(s, settings)) {
            b.css('font-weight', 'bold')
        } else {
            b.css('font-weight', 'normal')
        }
    }
}

function setSettings(newSettings) {
    settings = newSettings
    settingsToCookie(settings)
    settingsToUI(settings)
    boldDefaultButton(settings)
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
    wordbits = [[], []]
    confirmed = [false, false]
    focus = 0
    randomBank()
    scrambleBank()
    guesses = []
    bonusScored = 0
    bonusReceived = 0
    timeRemaining = getTimeLimit()
    refresh()
}

//TODO: change bonus behavior etc.

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
    document.cookie = name + "=" + (JSON.stringify(value) || "")  + "; max-age=315360000; path=/";
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
    pauseTime = time()
    pauseText = text
    queuedFunction = f
    refresh()
}

function pass() {}

function unpause() {
    if (time() >= waitUntil) {
        paused = false
        queuedFunction()
        refresh()
    } else {
        waitUntil = time()
    }
}

function currentWord() {
    return currentWordbits().join('')
}

// TODO: handle unconfirming words, rendering appropriately etc.
function doEnter() {
    const valid = isWord(currentWord())
    //TODO: make enter clear?
    if (!valid) {
        deleteAll()
    } else {
        confirmed[focus] = true
        if (confirmed[1-focus]) {
            addPair(wordbits.map(x => x.join('')))
        } else {
            focus = 1 - focus
        }
    }
}

function submitPair() {

}

function refreshChangeWarning() {
    if (!equalValues(settings, settingsFromUI())) {
        $('#changewarning').text("Press button to apply or revert changes")
    } else {
        $('#changewarning').text("")
    }
}

function loadScores() {
    const scoreFromCookie = getCookie(scoreKey)
    if (scoreFromCookie == null) {
        return {}
    } else {
        return scoreFromCookie
    }
}

function doTab() {
    if (!confirmed[focus] && isWord(currentWord())) confirmed[focus] = true
    focus = 1 - focus
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
            } else if (e.keyCode == 32) {
                e.preventDefault()
            }
        } else if (e.keyCode == 186 && settings.allowPausing){
            pauseThen("(Enter to resume)", pass)
        } else if (e.keyCode == 13){
            if (confirmed[focus]) {
                deleteAll()
            } else if (currentWordbits().length == 0) {
                focus = 1 - focus
            } else {
                doEnter()
            }
        } else if (e.keyCode == 8) {
            if (confirmed[focus]) {
                deleteAll()
            } else if (wordbits[focus].length == 0) {
                //focus = 1 - focus
            } else {
                deleteLetter()
            }
        } else if (e.keyCode == 32) {
            scrambleBank()
            e.preventDefault()
        } else if (e.keyCode == 9) {
            doTab()
            e.preventDefault()
        } else if (e.keyCode == 27) {
            fail(true)
        } else {
            const k = strFromKey(e)
            if (k != null) {
                const inBank = bankbits.indexOf(k) >= 0
                const inOther = wordbits[1-focus].indexOf(k) >= 0
                const inSelf = wordbits[focus].indexOf(k) >= 0
                const otherEmpty = wordbits[1-focus].length == 0
                if (confirmed[focus]) {
                    if (otherEmpty && inBank) {
                        focus = 1 - focus
                        addLetter(k)
                    } else if (inSelf || inBank) {
                        deleteAll()
                        addLetter(k)
                    } else if (inOther) {
                        focus = 1 - focus
                        deleteAll()
                        addLetter(k)
                    }
                } else {
                    if (inBank) {
                        addLetter(k)
                    } else if (inOther) {
                        focus = 1 - focus
                        deleteAll()
                        focus = 1 - focus
                        addLetter(k)
                    }
                }
            }
        }
        refresh()
    })
}

