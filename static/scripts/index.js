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

function showLoading() {
	document.getElementById('loading').style.display = '';
	return true;
}
