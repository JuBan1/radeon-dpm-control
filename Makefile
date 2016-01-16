all:

install:
	cp -r src/radeon-dpm-control@s3rius /usr/share/gnome-shell/extensions
	cp src/radeon-control-error.png /usr/share/icons/hicolor/64x64/apps/radeon-control-error.png
	cp src/radeon-control-green.png /usr/share/icons/hicolor/64x64/apps/radeon-control-green.png
	cp src/radeon-control-other.png /usr/share/icons/hicolor/64x64/apps/radeon-control-other.png
	cp src/radeon-control-red.png /usr/share/icons/hicolor/64x64/apps/radeon-control-red.png
	cp src/radeon-control-yellow.png /usr/share/icons/hicolor/64x64/apps/radeon-control-yellow.png
	gtk-update-icon-cache -f -t /usr/share/icons/hicolor/

uninstall:
	rm -r /usr/share/gnome-shell/extensions/radeon-dpm-control@s3rius
	rm /usr/share/icons/hicolor/64x64/apps/radeon-control-error.png
	rm /usr/share/icons/hicolor/64x64/apps/radeon-control-green.png
	rm /usr/share/icons/hicolor/64x64/apps/radeon-control-other.png
	rm /usr/share/icons/hicolor/64x64/apps/radeon-control-red.png
	rm /usr/share/icons/hicolor/64x64/apps/radeon-control-yellow.png
	gtk-update-icon-cache -f -t /usr/share/icons/hicolor/
