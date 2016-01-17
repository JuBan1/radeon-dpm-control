Radeon DPM Control
==================

![Sample Screenshot](http://i.imgur.com/ck8AyyF.png)

A GNOME3 extension to manually set Radeon's DPM state and level. Also includes a status indicator that shows the current setting.

The indicator shows a green, yellow or red Radeon symbol when the DPM settings are low/battery, auto/balanced or high/performance, respectively. Any other combination will make a yellow '?' show up. A red '!' indicates that the DPM settings could not be queried.


Prerequisite
------------

This extension makes use of Thomas Debesse's [`dpm-query`](https://github.com/illwieckz/dpm-query/). You will have to install it first. Only the tool is needed, the service is optionnal.


Installation
------------

Download the files and cd into their directory:

```sh
git clone https://github.com/JuBan1/radeon-dpm-control.git
cd radeon-dpm-control
```

Install in user path this way:

```sh
./configure
make install
```

Install system-wide this way:

```sh
./configure --system-wide
sudo make install
```

Update your GNOME shell by restarting or pressing Alt+F2 and typing `r`.

Enable the extension in your Tweak Tool.

You can also create a zip file doing `make zip`, you will find it in `build` directory.


Uninstallation
--------------

Disable the extension.

Run `make uninstall` (or `sudo make uninstall`) in the same location.
