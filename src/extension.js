/*
    Copyright (c) 2016 Julian Bansen

    Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, 
    provided that the above copyright notice and this permission notice appear in all copies.

    The software is provided "as is" and the author disclaims all warranties with regard to this software including all implied warranties of merchantability and fitness. 
    In no event shall the author be liable for any special, direct, indirect, or consequential damages or any damages whatsoever resulting from loss of use, data or profits, 
    whether in an action of contract, negligence or other tortious action, arising out of or in connection with the use or performance of this software.
*/

const GLib = imports.gi.GLib;
const Mainloop = imports.mainloop;
const Util = imports.misc.util;
const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;
const St = imports.gi.St;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const PanelMenu = imports.ui.panelMenu;
const Lang = imports.lang;
const Shell = imports.gi.Shell;
const Me = imports.misc.extensionUtils.getCurrentExtension();


/*
	Monitors only the first available AMD card, but can monitor a second one with almost no changes.
	But that makes little sense since we only show a single icon anyways.
*/

var cards = [
	{
		num: 0,
		valid: false,
		power_method: "/sys/class/drm/card0/device/power_method",
		perf_level: "/sys/class/drm/card0/device/power_dpm_force_performance_level",
		state: "/sys/class/drm/card0/device/power_dpm_state"
	}, 

	{
		num: 1,
		valid: false,
		power_method: "/sys/class/drm/card1/device/power_method",
		perf_level: "/sys/class/drm/card1/device/power_dpm_force_performance_level",
		state: "/sys/class/drm/card1/device/power_dpm_state"
	}, 
]

function init_card(card){

	//Before activating files monitors we need to check all necessary files for their existence. 
	//Also monitor whether power_method is actually set to "dpm". If it isn't, this extension is useless.
	if( GLib.file_test(card.power_method, GLib.FileTest.EXISTS) &&
		Shell.get_file_contents_utf8_sync(card.power_method).trim()=="dpm" &&
		GLib.file_test(card.perf_level, GLib.FileTest.EXISTS) && 
		GLib.file_test(card.state, GLib.FileTest.EXISTS)) {
			card.valid = true;
	}

}

function init_cards(){
	init_card(cards[0]);
}

function enable_monitoring(card, updateFunc){
	if(!card.valid)
		return;

	let perf_file_obj = Gio.file_new_for_path(card.perf_level);
	let state_file_obj = Gio.file_new_for_path(card.state);

	card.perf_monitor = perf_file_obj.monitor(Gio.FileMonitorFlags.NONE, null);
	card.state_monitor = state_file_obj.monitor(Gio.FileMonitorFlags.NONE, null);

	card.perf_monitor.connect('changed', updateFunc);
	card.state_monitor.connect('changed', updateFunc);
}

function disable_monitoring(card){
	if(!card.valid)
		return;

	card.perf_monitor.cancel();
	card.state_monitor.cancel();
}


function init()
{
	init_cards();
}

let dpmc;

function enable()
{
 	dpmc = new DPMControl();	

 	enable_monitoring(cards[0], Lang.bind(dpmc, dpmc._updateIcon) );
}

function disable()
{
    dpmc.destroy();

    disable_monitoring(cards[0]);
}

function PopupIconMenuItem()
{
  this._init.apply(this, arguments);
}

PopupIconMenuItem.prototype =
{
    __proto__: PopupMenu.PopupBaseMenuItem.prototype,

    _init: function(gicon, text, params)
    {
        PopupMenu.PopupBaseMenuItem.prototype._init.call(this, params);

        this.box = new St.BoxLayout({ style_class: "popup-combobox-item" });

        this.icon = new St.Icon({ gicon: gicon, style_class: "popup-menu-icon" });
        this.box.add(this.icon);

        this.label = new St.Label({ text: text });

        this.box.add(this.label);
        
        this.actor.add(this.box);
    },

    _onDestroy: function()
    {
        this.menu.removeAll();
    }
};

function DPMControl()
{
  this._init.apply(this, arguments);
}

DPMControl.prototype =
{
    __proto__: PanelMenu.Button.prototype,
 
    _init: function()
    {
        PanelMenu.Button.prototype._init.call(this, 0);

        this._icons = {
            "battery": Gio.icon_new_for_string(Me.path + "/icons/radeon-control-green.png"),
            "balanced": Gio.icon_new_for_string(Me.path + "/icons/radeon-control-yellow.png"),
            "performance": Gio.icon_new_for_string(Me.path + "/icons/radeon-control-red.png"),
            "error": Gio.icon_new_for_string(Me.path + "/icons/radeon-control-error.png"),
            "other": Gio.icon_new_for_string(Me.path + "/icons/radeon-control-other.png")
        };

        this.icon = new St.Icon({ gicon: this._icons["battery"], style_class: "system-status-icon" });

        this.actor.add_actor(this.icon);
        this.actor.add_style_class_name("panel-status-button");

        this._display();

        Main.panel.addToStatusArea("radeon-dpm-control", this);
    },

    _updateIcon: function()
    {
        let dpmquery_path = GLib.find_program_in_path("dpm-query");

        [res, pid, fdin, fdout, fderr] = GLib.spawn_async_with_pipes(null, [dpmquery_path, "get", "default"],
                                                                     null, GLib.SpawnFlags.SEARCH_PATH, null);
        let outstream = new Gio.UnixInputStream({fd:fdout,close_fd:true});
        let stdout = new Gio.DataInputStream({base_stream: outstream});

        let [out, size] = stdout.read_line(null);
        let [out2, size2] = stdout.read_line(null);

        if(out == null) {
             this._iconActor.icon_name = this._icons["error"];
        }
        else {
            let result = out.toString() + out2.toString();
            
            if( result.search("\"low\"") != -1 && result.search("\"battery\"") != -1 ){
                this.icon.gicon = this._icons["battery"];
            } else if( result.search("\"auto\"") != -1 && result.search("\"balanced\"") != -1 ) {
                this.icon.gicon = this._icons["balanced"];
            } else if( result.search("\"high\"") != -1 && result.search("\"performance\"") != -1 ) {
                this.icon.gicon = this._icons["performance"];
            } else{ 
                this.icon.gicon = this._icons["other"];
            }
        }
    },

   _display: function()
   {
        this._updateIcon();

        let gicon = this._icons["battery"];
        let menuItem = new PopupIconMenuItem(gicon, " Set Low/Battery", {});
        this.menu.addMenuItem(menuItem);
        menuItem.connect("activate", Lang.bind(this, this._setDPM, ["low", "battery"]));

        let gicon = this._icons["balanced"];
        let menuItem = new PopupIconMenuItem(gicon, " Set Auto/Balanced", {});
        this.menu.addMenuItem(menuItem);
        menuItem.connect("activate", Lang.bind(this, this._setDPM, ["auto", "balanced"]));

        let gicon = this._icons["performance"];
        let menuItem = new PopupIconMenuItem(gicon, " Set High/Performance", {});
        this.menu.addMenuItem(menuItem);
        menuItem.connect("activate", Lang.bind(this, this._setDPM, ["high", "performance"]));
    },

    // This code was taken and modified from:
    // http://stackoverflow.com/questions/10099593/gnome-shell-privilege-escalation
    _setDPM: function(a, b, settings)
    {
        let dpmquery_path = GLib.find_program_in_path("dpm-query");
        let pkexec_path = GLib.find_program_in_path("pkexec");

        [res, pid, fdin, fdout, fderr] = GLib.spawn_async_with_pipes(null, [dpmquery_path, "test", "default"],
                                                                     null, GLib.SpawnFlags.SEARCH_PATH, null);
        let outstream = new Gio.UnixInputStream({fd:fdout,close_fd:true});
        let stdout = new Gio.DataInputStream({base_stream: outstream});

        let [out, size] = stdout.read_line(null);

        if(out == null) {
            this._iconActor.icon_name = this._icons["error"];
        }
        else {
            let result = out.toString();
            if(result.search("forbidden") == -1) {
                [res, pid] = GLib.spawn_async_with_pipes(null, [dpmquery_path, "set", "default"].concat(settings),
                                                         null, GLib.SpawnFlags.SEARCH_PATH, null);
                GLib.spawn_close_pid(pid);
            }
            else {
                //DO_NOT_REAP_CHILD has to be passed in order to not immediately kill the child process before the user can authenticate himself.
                //Then we have to watch for the child ourselves and kill the process once it becomes a zombie.
                //More about this here: https://developer.gnome.org/glib/stable/glib-Spawning-Processes.html#g-spawn-async-with-pipes
                [res, pid] = GLib.spawn_async_with_pipes(null, [pkexec_path, dpmquery_path, "set", "default"].concat(settings),
                                                         null, GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD, null);

                //This function is documented here:
                //https://people.gnome.org/~gcampagna/docs/GLib-2.0/GLib.child_watch_add.html
                GLib.child_watch_add(GLib.PRIORITY_DEFAULT_IDLE, pid, waitpidCallback);
            }
        }
        GLib.spawn_close_pid(pid);
    },
};

function waitpidCallback(pid, status){
    GLib.spawn_close_pid(pid);
}
