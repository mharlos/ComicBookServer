function scrollToTop() {
	document.body.scrollTop = document.documentElement.scrollTop = 0;
	return true;
}

function toggleHelp() {
	var s = document.getElementById('helpContent').style;
	s.display = s.display ? '' : 'none';
	return true;
}

function hideHelp() {
	document.getElementById('helpContent').style.display = 'none';
	return true;
}
function toggleReq() {
	var s = document.getElementById('requests').style;
	s.display = s.display ? '' : 'none';
	return true;
}
function toggleIssue() {
        var s = document.getElementById('issues').style;
        s.display = s.display ? '' : 'none';
        return true;
}

function showLoading() {
	document.getElementById('loading').style.display = '';
	return true;
}
