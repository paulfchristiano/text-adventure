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
var lastWord;
var victories;
var failures;
var pauseText;

// TODO
//
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
    return ('<a href="https://en.wiktionary.org/wiki/'
        + word.toLowerCase()
        + '#English" target="_blank" style="text-decoration:none;color:black" >'
        + word +'</a>')
}

function renderWords(words) {
    return words.map(renderWord).join(' ')
}


function refresh() {
    if (paused) {
        $('#source').html(pauseText)
        $('#source').css('font-family', 'Times New Roman')
    } else {
        $('#source').text(bankbits.join(''))
        $('#source').css('font-family', 'monospace')
    }
    $('#word').text(wordbits.join(''))

    $('#victorycount').text(victories.length)
    $('#attempts').text(failures.length + victories.length)

    $('#victories').html(renderWords(victories))
    $('#failures').html(renderWords(failures))
    $('#guesses').html(renderWords(guesses))
    showTime()
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
    pauseText = "(It was " + renderWord(secretWord) + ")"
    failures.push(secretWord)
    initialize()
}

function succeed(word) {
    bonusTimeText = 0
    pauseText = "(Enter to start)"
    victories.push(word)
    initialize()
}

function addWord() {
    if (guesses.indexOf(currentWord()) == -1) {
        guesses.push(currentWord())
        var bonusTime = Math.max(0, currentWord().length - settings.timeAddedThreshold)
        timeRemaining += bonusTime
        bonusTimeText = bonusTime
        showTime()
    }
}

function isChecked(name) {
    return $('input[name='+name+']:checked').length > 0
}

function getValue(name) {
    return $('input[name='+name+']:checked').val()
}

var defaultSettings = {
    timeAdjustmentRule: '+15',
    useTimer: true,
    allowPausing: false,
    baseTimeLimit: 30,
    minLength: 6,
    maxLength: 8,
    dictionaryName: '50k',
    timeAddedThreshold: 2
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
        timeAddedThreshold : Number(getValue('timeaddition')),
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
    setTo('timeaddition', settings.timeAddedThreshold)
}

function setSettings(newSettings) {
    settings = newSettings
    settingsToCookie(settings)
    settingsToUI(settings)
}


function reset(){
    victories = []
    failures = []
    secretWord = ""
    pauseText = "(Enter to start)"

    setSettings(settingsFromUI())

    initialize()
}

function applyAndReset() {
    setSettings(settingsFromUI())
    reset()
}

function backToDefaults() {
    setSettings(defaultSettings)
    reset()
}

function initialize() {
    wordbits = []
    paused = true
    lastWord = secretWord
    randomBank()
    scrambleBank()
    guesses = []
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
    document.cookie = name + "=" + (value || "")  + "; path=/";
}
function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}
function settingsFromCookie() {
    var loaded = getCookie('settings')
    if (loaded == null) {
        return defaultSettings
    } else {
        return JSON.parse(loaded)
    }
}
function settingsToCookie(settings) {
    setCookie('settings', JSON.stringify(settings))
}

function load() {
    setSettings(settingsFromCookie())
    setInterval(heartbeat, 1000)
    reset()
    $(document).click(e => {
        if (!equalValues(settings, settingsFromUI())) {
            $('#changewarning').text("Press button to apply changes")
        } else {
            $('#changewarning').text("")
        }
    })
    $(document).keydown(e => {
        bonusTimeText = 0
        if (paused) {
            if (e.keyCode == 13 || e.keyCode == 186) {
                paused = false
            }
        } else if (e.keyCode == 186 && settings.allowPausing){
            pauseText = "(Enter to resume)"
            paused = true
        } else if (e.keyCode == 13){
            if (winner()) {
                succeed(currentWord())
            } else if (isWord(currentWord())) {
                addWord(currentWord())
                deleteAll()
            } else {
                deleteAll()
            }
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

