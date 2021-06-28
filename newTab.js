chrome.storage.local.get(null, function(options) {
	if (options.w) { // restore windows
		let keys = Object.keys(options.w);
		for (const key of keys) {
			let w = options.w[key];

			drawWindow(key, w.title, w.x, w.y, w.w, w.h, 1);
		}
	}

	if (options.background === 'image') {
		document.body.style.background = 'url(' + options.bg_url + ') repeat fixed center center / cover';
		document.head.insertAdjacentHTML('beforeend', '<style>body > .desktopLink {color:#fff;text-shadow:0 0 3px #000}</style>');

	} else if (options.background === 'color') {
		document.body.style.background = options.bg_color;
	}

	if (options.custom_css) {
		document.head.insertAdjacentHTML('beforeend', '<style>' + options.custom_css + '</style>');
	}

	if (options.toolbar_as_folder) {
		registerFolder('toolbar_____');
	} else {
		chrome.bookmarks.getChildren('toolbar_____', function (bms) {
			for (let i = 0; i < bms.length; ++i) {
				if (bms[i].type === 'bookmark') {
					document.body.insertAdjacentHTML('beforeend', '<a class="desktopLink" id="' + bms[i].id + '" title="' + bms[i].title + '" href="' + bms[i].url + '"><img width="16px" height="16px" src="https://s2.googleusercontent.com/s2/favicons?domain_url=' + bms[i].url + '"/>' + bms[i].title + '</a>');
					dragonPrepare(bms[i].id);
				} else if (bms[i].type === 'folder') {
					document.body.insertAdjacentHTML('beforeend', '<div class="desktopFolder" id="' + bms[i].id + '" title="' + bms[i].title + '" draggable="true">' + bms[i].title + '</div>');
					registerFolder(bms[i].id);
					dragonPrepare(bms[i].id);
				}
			}
		});
		document.body.style.maxWidth = '1280px';
		document.getElementById('toolbar_____').outerHTML = null;
	}

	if (options.show_search_tips) {
		document.getElementById('tip_container').style.visibility = 'visible';
	}

	if (options.font && options.font !== "0.5") {
		document.head.insertAdjacentHTML('beforeend', '<style>*{font-size-adjust:' + options.font + '}</style>');
	}

	if (Object.entries(options).length === 0) { // if no options yet
		chrome.runtime.setUninstallURL('http://zarch.info/UMiBO/uninstalled.html');
		chrome.storage.local.set({
            toolbar_as_folder: true,
            show_search_tips: true,
			background: "image",
            bg_url: "https://images.unsplash.com/photo-1600627225432-82de96999068?auto=format&fit=crop&w=2550&q=80",
            bg_color: "#ffffff",
            custom_css: null
		});
		location.reload();
	}
});

function registerFolder(folder) {
	document.getElementById(folder).addEventListener('click', function(folder) {
		let folderId = folder.target.id;
		let existingWindow = document.getElementById('win_'+folderId);

		if (existingWindow === null) {
			let folderTitle = folder.target.innerHTML;
			let len = document.getElementsByClassName('window').length;

			drawWindow(folderId, folderTitle, folder.clientX-200, folder.clientY+50, 400, 300, len);
			if (window.matchMedia("(prefers-reduced-motion: no-preference)").matches) {
    			document.getElementById('win_'+folderId).animate(
    				[{ transform: 'scale(0.2)' }, {}],
    				{ duration: 128 }
    			);
			}

			// save in local storage
			chrome.storage.local.get('w', function(o) {
				let arr_windows = o.w ?? [];

				arr_windows[folderId] = {
					title: folderTitle,
					y: folder.clientY+50,
					x: folder.clientX-200,
					h: 300,
					w: 400
				};
				chrome.storage.local.set({'w': arr_windows});
			});
		} else {
			existingWindow.animate(
				[{ boxShadow: '0 0 0 5px var(--hi-click)' }, { boxShadow: 'none' }],
				{ duration: 500 }
			);
		}
	});
}

let move_target, mouse_over, drop_target, resize_target, raise_target, delete_drop_target, offsetX, offsetY;
let closing = false;

function drawWindow(id, title, x, y, w, h, z) {
// check if window stuck
	if (y < 0) {
		y = 0;
	}

	if (x < 0) {
		x = 0;
	}

// draw
	document.body.insertAdjacentHTML(
        'beforeend',
        '<div id="win_'+id+'" index="'+id+'" style="top:'+y+'px; left:'+x+'px;z-index:'+z+'" class="window">'
        +'<div class="border" title="'+title+'">'
        +'<span class="create_button" title="Create">'
        +'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 2 16 16" width="12" height="12"><path d="M3 7 1.5 7l-.5.5L1 9l.5.5 1.5 0 .5-.5 0-1.5z"/><path d="m8.75 7-1.5 0-.5.5 0 1.5.5.5 1.5 0 .5-.5 0-1.5z"/><path d="M14.5 7 13 7l-.5.5 0 1.5.5.5 1.5 0L15 9l0-1.5z"/></svg>'
        +'</span>'
        +title+'<span class="close_button" title="Close">'
        +'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 2 16 16" width="12" height="12"><path d="m9.108 7.776 4.709-4.709a.626.626 0 0 0-.884-.885L8.244 6.871l-.488 0-4.689-4.688a.625.625 0 1 0-.884.885L6.87 7.754l0 .491-4.687 4.687a.626.626 0 0 0 .884.885L7.754 9.13l.491 0 4.687 4.687a.627.627 0 0 0 .885 0 .626.626 0 0 0 0-.885L9.108 8.223l0-.447z"/></svg>'
        +'</span></div>'
        +'<main style="height:'+h+'px;width:'+w+'px"></main><div class="resize"></div>'
        +'<div class="dropzone" id="drop_'+id+'"></div></div>'
    );

	let window = document.getElementById('win_'+id);

// populate
	chrome.bookmarks.getChildren(id, function(e) {
	    let elements = '';
	    let foldersIds = [];
	    let linksIds = [];

		for (let i = 0; i < e.length; ++i) {
			let el = e[i];
			if (el.type === 'bookmark') {
				if (el.title === '') {
					el.title = el.url;
				}

				elements += '<a class="desktopLink" id="'+el.id+'" title="'+el.title+'" href="'+el.url+'"><img loading="lazy" width="16px" height="16px" src="https://s2.googleusercontent.com/s2/favicons?domain_url='+el.url+'"/>'+el.title+'</a>';
			    linksIds.push(el.id);
			} else if (el.type === 'folder') {
			    elements += '<div class="desktopFolder" id="'+el.id+'" title="'+el.title+'" draggable="true">'+el.title+'</div>';
			    foldersIds.push(el.id);
			}
		}

		window.childNodes[1].innerHTML = elements;

		for (let i = 0; i < foldersIds.length; i++) {
		    registerFolder(foldersIds[i]);
		    dragonPrepare(foldersIds[i]);
		}

		for (let i = 0; i < linksIds.length; i++) {
		    dragonPrepare(linksIds[i]);
		}
	});

// move
	window.childNodes[0].addEventListener('mousedown', function(e) {
		if (!e.target.classList.contains('border')) {
			return;
		}

		offsetX = e.pageX - window.offsetLeft;
		offsetY = e.pageY - window.offsetTop;
		move_target = window;
		document.body.insertAdjacentHTML('beforeend','<div id="secureDrag"></div>');
		document.getElementById('secureDrag').style.cursor = 'grabbing';
	});

// raise
	window.addEventListener('mousedown', function() {
		if (closing) {
			return;
		}

		let allWindows = document.getElementsByClassName('window');
		for (let i = 0; i < allWindows.length; ++i) {
			if (allWindows[i].style.zIndex > 0 && window.style.zIndex < allWindows.length) {
				allWindows[i].style.zIndex--;
			}
		}
		window.style.zIndex = allWindows.length.toString();
		raise_target = window;
	});

// close
	window.childNodes[0].childNodes[2].addEventListener('mousedown', function() {
		closing = true;
		window.remove();

		chrome.storage.local.get('w', function(o) {
			let arr_windows = o.w;
			delete arr_windows[id]; // si tout explose c'est de sa faute
			chrome.storage.local.set({'w': arr_windows });
			closing = false;
		});
	});

// resize
	window.childNodes[2].addEventListener('mousedown', function(e) {
		pX = e.pageX;
		pY = e.pageY;
		wH = window.childNodes[1].offsetHeight; //current height
		wW = window.childNodes[1].offsetWidth; //current width
		resize_target = window;
		document.body.insertAdjacentHTML('beforeend','<div id="secureDrag"></div>');
		document.getElementById('secureDrag').style.cursor = 'nwse-resize';
	});

// create folder
	window.childNodes[0].childNodes[0].addEventListener('mousedown', function() {
		if (document.getElementById('createFolderForm')) {
			document.getElementById('createFolderForm').remove();
			return;
		}

		let label = browser.i18n.getMessage("newFolderLabel");
		let submit = browser.i18n.getMessage("newFolderSubmit");
		let placeholder = browser.i18n.getMessage("newFolderPlaceholder");

		let content = '<form id="createFolderForm">'
			+ '<label>'+label+'<input name="folderName" placeholder="'+placeholder+'" type="text" required></label>'
			+ '<input name="origin" type="hidden" value="'+id+'">'
			+ '<input type="submit" value="'+submit+'"></form>';
		window.insertAdjacentHTML('beforeend', content);

		document.getElementById('createFolderForm').addEventListener('submit', function(e) {
			e.preventDefault();
			let formData = new FormData(e.target);

			browser.bookmarks.create({
				parentId: formData.get('origin'),
				title: formData.get('folderName')
			}).then(function() {
				location.reload();
			});
		});
	});
}

// translations
ToTranslate = document.getElementsByTagName('data');
for (let i = 0; i < ToTranslate.length; ++i) {
	ToTranslate[i].innerHTML = browser.i18n.getMessage(ToTranslate[i].value);
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

document.body.addEventListener('mouseup', function() {
	let win = move_target ?? resize_target ?? raise_target ?? null;
	if (win) {
		chrome.storage.local.get('w', function(o) {
			let arr_windows = o.w ?? [];

			delete arr_windows[win.getAttribute('index')];
			arr_windows[win.getAttribute('index')] = {
				title:	win.childNodes[0].title,
				x:		win.offsetLeft,
				y:		win.offsetTop,
				w:		win.childNodes[1].offsetWidth, // 0 is <border>, 1 is <main>, 2 is <resize>
				h:		win.childNodes[1].offsetHeight,
			};
			chrome.storage.local.set({'w': arr_windows });
		});
		move_target = null;
		resize_target = null;
		raise_target = null;

		if (document.getElementById('secureDrag')) {
			document.getElementById('secureDrag').outerHTML = '';
		}
	}
});

function dragonPrepare(id) {
	document.getElementById(id).addEventListener('dragstart', function(e) {
		dragon_target = e.currentTarget.id;

		// place dropzones
		let Dropzones = document.getElementsByClassName('dropzone');
		for (let i = 0; i < Dropzones.length; ++i) {
			Dropzones[i].style.display = 'block';
			Dropzones[i].style.outline = '3px solid var(--hi-click)';

			Dropzones[i].addEventListener('dragenter', function(e) {
				if (
					e.target.id &&
					(e.target.classList.contains('dropzone') || e.target.classList.contains('desktopFolder'))
				) {
					drop_target = e.target.id.replace('drop_','');
				}
			});
		}

		// place delete zone
		document.getElementById('delete_vortex').style.visibility = 'visible';
	});

	document.getElementById(id).addEventListener('mouseenter', function(e) {
	    mouse_over = e.currentTarget;
	});

    document.getElementById(id).addEventListener('mouseleave', function(e) {
	    mouse_over = null;
	});
}
// drop
document.addEventListener('dragend', function() {
	if (
		(dragon_target && drop_target) &&
		(dragon_target !== drop_target) //had to check that
	) {
	    chrome.bookmarks.get(dragon_target, function(e) { // check if we're already in the destination
	        if (e[0].parentId !== drop_target) {
                chrome.bookmarks.move(dragon_target, {parentId: drop_target}).then(function() {
                    location.reload();
                }); // moving between zones
	        }
	    });
	} else if (dragon_target && delete_drop_target) { // dropping in vortex
		browser.bookmarks.remove(dragon_target).then(function() {
			location.reload();
		});
	}

    location.reload();
});

registerFolder('menu________');
registerFolder('mobile______');
registerFolder('unfiled_____');

document.getElementById('options').addEventListener("mousedown", function() {
	chrome.runtime.openOptionsPage();
});

// watching for delete vortex
document.getElementById('delete_vortex').addEventListener('dragenter', function() {
	if (dragon_target != null) {
		delete_drop_target = true;
		drop_target = null;
	}
});

var editing = false;
document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && mouse_over !== null && editing === false) {
        editing = true;

        mouse_over.outerHTML = '<form id="renameForm">'
           + '<input value="'+mouse_over.title+'" name="folderName" type="text" required>'
           + '<input name="origin" type="hidden" value="'+mouse_over.id+'">';

        mouse_over = null;

        document.getElementById('renameForm').addEventListener('submit', function(e) {
            e.preventDefault();
            let formData = new FormData(e.target);

            chrome.bookmarks.update(
                formData.get('origin'),
                {
                    title: formData.get('folderName')
                }
            ).then(function() {
                location.reload();
            });
        });
    }
});
