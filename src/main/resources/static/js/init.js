var reportConfigUrl = '/bahmni_config/openmrs/apps/reports/reports.json';
var downloadUrl = '/dhis-integration/download?name=NAME&year=YEAR&month=MONTH';
var submitUrl = '/dhis-integration/submit-to-dhis';
var loginRedirectUrl = '/bahmni/home/index.html#/login?showLoginMessage&from=';
var dhis2ConfigUrl = '/bahmni_config/openmrs/apps/dhis2/app.json';
var years, config, months, approximateYear;

$(document).ready(function () {
    isAuthenticated()
        .then(getConfig)
        .then(setupCalendar)
        .then(renderPrograms)
        .then(selectApproxLatestYear)
        .then(registerCalendarTypeDisplay)
        .then(registerOnchangeOnComment);
});

var registerCalendarTypeDisplay = function () {
    $('[id^="calendarType"]').html(config.calendar);
}

var getConfig = function () {
    return $.getJSON(dhis2ConfigUrl).then(function (response) {
        config = response.config;
    });
};

var setupCalendar = function () {
    var calendarUrl = "/bahmni_config/openmrs/apps/dhis2/calendars/" + config.calendar + ".json";
    return $.getJSON(calendarUrl).then(function (response) {
       months = response.months;
       years = range(eval(config.endYear), config.startYear);
       approximateYear  = eval(response.currentYear);
    });
}

function isAuthenticated() {
    return $.get("is-logged-in").then(function(response){
        if(response!='Logged in'){
            window.location.href = loginRedirectUrl + window.location.href;
        }
    }).fail(function(response){
        if(response && response.status != 200){
            window.location.href = loginRedirectUrl;
        }
    });
}
function range(start, end) {
    return Array.apply(null, new Array(start - end + 1)).map(function (ignore, index) {
        return start - index;
    });
}
function selectApproxLatestYear() {
    $('[id^="year-"]').val(approximateYear);
}

function renderPrograms() {
    return $.get('html/programs.html').then(function (template) {
        return getContent().then(function (content) {
            $("#programs").html(Mustache.render(template, content));
        });
    });
}
function getContent() {
    return getDHISPrograms().then(function (programs) {
        return {months: months, years: years, programs: programs};
    });
}
function getDHISPrograms() {
    return $.getJSON(reportConfigUrl).then(function (reportConfigs) {
        var DHISPrograms = [];
        Object.keys(reportConfigs).forEach(function (reportKey) {
            if (reportConfigs[reportKey].DHISProgram) {
                reportConfigs[reportKey].index = DHISPrograms.length;
                DHISPrograms.push(reportConfigs[reportKey]);
            }
        });
        return DHISPrograms;
    });
}
function putStatus(data, index) {
    if (data.status == 'Success') {
        return element('status', index).html($('#success-status-template').html());
    }
    var template = $('#failure-status-template').html();
    Mustache.parse(template);
    data.message = JSON.stringify(data.exception || data.response);
    element('status', index).html(Mustache.render(template, data));
    element('status', index).find('.status-failure').on('click', function(){
        alert(data.message);
        console.log(data.message);
    });
}
function download(index) {
    var year = element('year', index).val();
    var month = element('month', index).val();
    var programName = element('program-name', index).html();
    var url = downloadUrl.replace('NAME', programName).replace('YEAR', year).replace('MONTH', month);
    var a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.click();
    return false;
}
function submit(index) {
    var year = element('year', index).val();
    var month = element('month', index).val();
    var programName = element('program-name', index).html();
    var comment = element('comment', index).val();
    var parameters = {
        year: year,
        month: month,
        name: programName,
        comment: comment
    };

    disableBtn(element('submit', index));
    $.get(submitUrl, parameters).done(function (data) {
        putStatus(JSON.parse(data), index);
    }).fail(function (response) {
        if(response.status == 403){
            putStatus({status:'Failure', exception: 'Not Authenticated'}, index);
        }
        putStatus({status:'Failure', exception: response}, index);
    }).always(function () {
        enableBtn(element('submit', index));
    });
}
function confirmAndSubmit(index) {
    if (confirm("This action cannot be reversed. Are you sure, you want to submit?")) {
        submit(index);
    }
}
function element(name,index){
    var id = name +'-' + index;
    return $('[id="'+id+'"]');
}
function enableBtn(btn){
    return btn.attr('disabled', false).removeClass('btn-disabled');
}
function disableBtn(btn){
    return btn.attr('disabled', true).addClass('btn-disabled');
}
function disableAllSubmitBtns(){
    disableBtn($("[id*='submit-']"));
}
function registerOnchangeOnComment(){
    disableAllSubmitBtns();
    $("[id*='comment-']").on('change keyup paste',function(event){
        var index = $(event.target).attr('index');
        if($(event.target).val().trim()!=""){
            enableBtn(element('submit',index));
        } else {
            disableBtn(element('submit',index));
        }
    });
}