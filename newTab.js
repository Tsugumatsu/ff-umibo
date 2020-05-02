browser.storage.local.get().then(function(options) {
	if(!options.separate_categories) {
		if(options.categories_toolbar) {
			browser.bookmarks.getChildren('toolbar_____').then(function(bms) {
				l = bms.length;
				for (i = 0 ; i < l ; ++i) {
					fetchFolder(bms[i]);
				}
			});
		}
		if(options.categories_menu) {
			browser.bookmarks.getChildren('menu________').then(function(bms) {
				l = bms.length;
				for (i = 0 ; i < l ; ++i) {
					fetchFolder(bms[i]);
				}
			});
		}
		if(options.categories_mobile) {
			browser.bookmarks.getChildren('mobile______').then(function(bms) {
				l = bms.length;
				for (i = 0 ; i < l ; ++i) {
					fetchFolder(bms[i]);
				}
			});
		}
		if(options.categories_other) {
			browser.bookmarks.getChildren('unfiled_____').then(function(bms) {
				l = bms.length;
				for (i = 0 ; i < l ; ++i) {
					fetchFolder(bms[i]);
				}
			});
		}
	} else {
		if(options.categories_toolbar) {
			browser.bookmarks.get('toolbar_____').then(function(sub) {
				fetchFolder(sub[0]);
			});
		}
		if(options.categories_menu) {
			browser.bookmarks.get('menu________').then(function(sub) {
				fetchFolder(sub[0]);
			});
		}
		if(options.categories_mobile) {
			browser.bookmarks.get('mobile______').then(function(sub) {
				fetchFolder(sub[0]);
			});
		}
		if(options.categories_other) {
			browser.bookmarks.get('unfiled_____').then(function(sub) {
				fetchFolder(sub[0]);
			});
		}
	}

	if(options.windows) { // restore windows
		keys = Object.keys(options.windows);
		var i = 1;
		for (let key of keys) {
			w = options.windows[key];

			// check if window stuck
			if (w.y < 10) {
				w.y = 10;
			} else if (w.y > window.innerHeight - 20) {
				w.y = window.innerHeight - 200;
			}
			if (w.x < -200) {
				w.x = 10;
			} else if (w.x > window.innerWidth - 50) {
				w.x = window.innerWidth - 200;
			}

			drawWindow(w.id, w.title, w.x, w.y, w.w, w.h, i++)

			if (w.id != null) {
				registerWindow('win_'+w.id);
				populateWindow(w.id);
			}
		}
	}

	if(options.show_search_tips) {
		document.getElementById('tip_container').style.display = 'block';
	}

	if (Object.entries(options).length === 0) { // if no options yet
		browser.runtime.setUninstallURL('http://zarch.info/UMiBO/uninstalled.html');
		browser.storage.local.set({
			bg: "follow_theme",
			categories_toolbar: true,
			show_search_tips: true
		});
		location.reload();
	}
});

var move_target,resize_target,dragon_target;
var closing = false;
var drop_target = false;
var delete_drop_target = false;

function registerFolder(folder) {
	document.getElementById(folder).addEventListener('click', function(folder) {
		folderId = folder.target.id;

		if (document.getElementById('win_'+folderId) == null) {
			folderTitle = folder.target.innerHTML;
			len = document.getElementsByClassName('window').length;

			drawWindow(folderId, folderTitle, folder.clientX-200, folder.clientY+50, 400, 300, len)

			// save in local storage
			browser.storage.local.get().then(function(o) {
				o.windows ? arr_windows = o.windows : arr_windows = [];

				arr_windows[folderId] = {
					id: folderId,
					title: folderTitle,
					y: folder.clientY+50,
					x: folder.clientX-200,
					h: 300,
					w: 400,
					z: len,
				};
				browser.storage.local.set({'windows': arr_windows});
			});

			if (folderId != null) {
				registerWindow('win_'+folderId);
				populateWindow(folderId);
			}
		}
	});
}

function registerWindow(id) {
// move
	document.getElementById(id).childNodes[0].addEventListener('mousedown', function(e) {
		offsetX = e.pageX - e.currentTarget.parentNode.offsetLeft;
		offsetY = e.pageY - e.currentTarget.parentNode.offsetTop;
		move_target = e.currentTarget.parentNode;
		document.body.insertAdjacentHTML('beforeend','<div id="secureDrag"></div>');
	});

// raise
	document.getElementById(id).addEventListener('mousedown', function(e) {
		allWindows = document.getElementsByClassName('window');
		for (var i = 0; i < allWindows.length; i++) {
			
			if(allWindows[i].style.zIndex > 0 && e.currentTarget.style.zIndex != allWindows.length) {
				allWindows[i].style.zIndex--;
				allWindows[i].classList.remove('firstWindow');
			}
		}
		e.currentTarget.style.zIndex = allWindows.length;
		e.currentTarget.classList.add('firstWindow');
	});

// close
	document.getElementById(id).childNodes[0].childNodes[1].addEventListener('mousedown', function(e) {
		e.target.parentNode.parentNode.remove();
		id = e.target.parentNode.parentNode.getAttribute('index');

		browser.storage.local.get().then(function(o) {
			arr_windows = o.windows;
			delete arr_windows[id]; // si tout explose c'est de sa faute
			browser.storage.local.set({'windows': arr_windows });
		});
		closing = true;
	});

// resize
	document.getElementById(id).childNodes[2].addEventListener('mousedown', function(e) {
		pX = e.pageX;
		pY = e.pageY;
		wH = e.currentTarget.parentNode.childNodes[1].offsetHeight; //current height
		wW = e.currentTarget.parentNode.childNodes[1].offsetWidth; //current width
		resize_target = e.currentTarget.parentNode;
		document.body.insertAdjacentHTML('beforeend','<div id="secureDrag"></div>');
	});
}

function populateWindow(id) {
	browser.bookmarks.getChildren(id).then(function(e) {
		WindowMain = document.getElementById('win_'+id).childNodes[1];
		BookmarksLength = e.length;

		for (var i = 0; i < BookmarksLength; ++i) {
			var el = e[i];
			if (el.type == 'bookmark') {
				if (el.title == '') {
					el.title = el.url.substring(0, 50);
				}
				// OPTIMISER FETCH ICONS, TROP LENT QUAND OUVERTURE DE FENETRE
				WindowMain.insertAdjacentHTML('beforeend', '<a id="'+el.id+'" title="'+el.title+'" href="'+el.url+'"><img loading="lazy" width="16px" height="16px" src="https://s2.googleusercontent.com/s2/favicons?domain_url='+el.url+'"/>'+el.title+'</a>');
				dragonPrepare(el.id);
			} else if (el.type == 'folder') {
				WindowMain.insertAdjacentHTML('beforeend', '<article id="'+el.id+'" title="'+el.title+'" href="'+el.id+'" draggable="true">'+el.title+'</article>');
				registerFolder(el.id);
				dragonPrepare(el.id);
			} else {
				WindowMain.insertAdjacentHTML('beforeend', '<hr>');
			}
		}
	});
}

function fetchFolder(sub) { // desktop icons
	if (sub.type === 'bookmark') {
		document.body.insertAdjacentHTML('beforeend', '<a id="'+sub.id+'" title="'+sub.title+'" class="desktopFolder" href="'+sub.url+'"><img width="16px" height="16px" src="https://s2.googleusercontent.com/s2/favicons?domain_url='+sub.url+'"/>'+sub.title+'</a>');
		dragonPrepare(sub.id);
	} else if (sub.type === 'folder') {
		document.body.insertAdjacentHTML('beforeend', '<div class="desktopFolder" id="'+sub.id+'" title="'+sub.title+'" href="'+sub.id+'" draggable="true">'+sub.title+'</div>');
		registerFolder(sub.id);
		dragonPrepare(sub.id);
	} else {
		document.body.insertAdjacentHTML('beforeend', '<hr>');
	}
}

function dragonPrepare(id) {
	document.getElementById(id).addEventListener('dragstart',function(e){
		dragon_target = e.currentTarget.id;
		
		// place dropzones
		Dropzones = document.getElementsByClassName('dropzone');
		for (i = 0; i < Dropzones.length; ++i) {
			Dropzones[i].style.display = 'block';
			
			Dropzones[i].addEventListener('dragenter', function(e) {
				drop_target = e.target.getAttribute('id');
			});
		}
		
		// place delete zone
		document.getElementById('delete_vortex').style.display = 'block';
	});
}

document.body.addEventListener('mousemove',function(e) {
	if (move_target) {
		move_target.style.left = e.pageX - offsetX+'px';
		move_target.style.top = e.pageY - offsetY+'px';
	} else if (resize_target) {
		resize_target.childNodes[1].style.height = wH + e.pageY - pY+'px';
		resize_target.childNodes[1].style.width = wW + e.pageX - pX+'px';
	}
});
document.body.addEventListener('mouseup', function(e) {
	if (move_target || resize_target) {
		win = resize_target ? resize_target : move_target;

		if (closing == false) {
			browser.storage.local.get().then(function(o) {
				o.windows ? arr_windows = o.windows : arr_windows = [];

				arr_windows[win.getAttribute('index')] = {
					id:		win.getAttribute('index'),
					title:	win.childNodes[0].title,
					x:		win.offsetLeft,
					y:		win.offsetTop,
					w:		win.childNodes[1].offsetWidth, // 0 is <border>, 1 is <main>, 2 is <resize>
					h:		win.childNodes[1].offsetHeight,
				};
				browser.storage.local.set({'windows': arr_windows });
			});
		}
		move_target = null;
		resize_target = null;
	}

	closing = false;
	if(document.getElementById('secureDrag') !== null) {
		document.getElementById('secureDrag').outerHTML = '';
	}
});

// watching for delete vortex
document.getElementById('delete_vortex').addEventListener('dragenter',function(e) { // TODO target all dropzones
	if (dragon_target != null) {
		delete_drop_target = true;
		drop_target = null;
	}
});

// drop
document.addEventListener('dragend', function(e) {
	if (dragon_target && drop_target) { // moving between windows
		browser.bookmarks.move(dragon_target, {parentId: drop_target}); // TODO catch errors

		lien = document.getElementById(dragon_target);
		document.getElementById('win_'+drop_target).childNodes[1].insertAdjacentHTML('beforeend', lien.outerHTML);
		lien.remove();

		dragonPrepare(dragon_target);
		if (lien.tagName === "ARTICLE") {
			registerFolder(dragon_target);
		}
	} else if (dragon_target && delete_drop_target === true) { // dropping in vortex
		browser.bookmarks.remove(dragon_target).then(function(){
			lien = document.getElementById(dragon_target);
			lien.remove();
		});
	}
	
	Dropzones = document.getElementsByClassName('dropzone');
	for (i = 0; i < Dropzones.length; ++i) {
		Dropzones[i].style.display = 'none';
	}
	
	delete_drop_target = false;
	drop_target = null;
	document.getElementById('delete_vortex').style.display = 'none';
});

function drawWindow(id, title, x, y, w, h, z)
{
	document.body.insertAdjacentHTML('beforeend', '<div id="win_'+id+'" index="'+id+'" style="top:'+y+'px; left:'+x+'px" class="window"><div class="border" title="'+title+'">'+title+'<span id="close_button" title="Close"></span></div><main style="height:'+h+'px;width:'+w+'px"></main><div class="resize"></div><div class="dropzone" id="'+id+'"></div></div>');
}