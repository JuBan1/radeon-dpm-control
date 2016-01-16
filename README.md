# radeon-dpm-control
A GNOME3 extension to manually set Radeon's DPM state and level. Also includes a status indicator that shows the current setting.

The indicator shows a green, yellow or red Radeon symbol when the DPM settings are low/battery, auto/balanced or high/performance, respectively. Any other combination will make a yellow '?' show up. A red '!' indicates that the DPM settings could not be queried.

# Prerequisite

This extension makes use of Thomas Debesse's dpm-query (https://github.com/illwieckz/dpm-query/). You will have to install it first.

# Installation
Download the files and cd into their directory.
Run "sudo make install"
Update your GNOME shell by restarting or pressing Alt+F2 and typing 'r'.
You might have to enable the extension in your Tweak Tool.

# Uninstallation
Run "sudo make uninstall"
