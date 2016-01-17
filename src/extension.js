/*
    
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
const Me = imports.misc.extensionUtils.getCurrentExtension();

function init()
{
}

let dpmc;
let event=null;

function enable()
{
  dpmc = new DPMControl();
}

function disable()
{
    dpmc.destroy();
    Mainloop.source_remove(event);
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
            "battery": Me.path + "/icons/radeon-control-green.png",
            "balanced": Me.path + "/icons/radeon-control-yellow.png",
            "performance": Me.path + "/icons/radeon-control-red.png",
            "error": Me.path + "/icons/radeon-control-error.png",
            "other": Me.path + "/icons/radeon-control-other.png"
        };

        this.icon = new St.Icon({ gicon: Gio.icon_new_for_string(this._icons["battery"]), style_class: "system-status-icon" });

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
                this.icon.gicon = Gio.icon_new_for_string(this._icons["battery"]);
            } else if( result.search("\"auto\"") != -1 && result.search("\"balanced\"") != -1 ) {
                this.icon.gicon = Gio.icon_new_for_string(this._icons["balanced"]);
            } else if( result.search("\"high\"") != -1 && result.search("\"performance\"") != -1 ) {
                this.icon.gicon = Gio.icon_new_for_string(this._icons["performance"]);
            } else{ 
                this.icon.gicon = Gio.icon_new_for_string(this._icons["other"]);
            }
        }
    },

   _display: function()
   {
        this._updateIcon();

        let gicon = Gio.icon_new_for_string(this._icons["battery"]);
        let menuItem = new PopupIconMenuItem(gicon, " Set Low/Battery", {});
        this.menu.addMenuItem(menuItem);
        menuItem.connect("activate", Lang.bind(this, this._setDPM, ["low", "battery"]));

        let gicon = Gio.icon_new_for_string(this._icons["balanced"]);
        let menuItem = new PopupIconMenuItem(gicon, " Set Auto/Balanced", {});
        this.menu.addMenuItem(menuItem);
        menuItem.connect("activate", Lang.bind(this, this._setDPM, ["auto", "balanced"]));

        let gicon = Gio.icon_new_for_string(this._icons["performance"]);
        let menuItem = new PopupIconMenuItem(gicon, " Set High/Performance", {});
        this.menu.addMenuItem(menuItem);
        menuItem.connect("activate", Lang.bind(this, this._setDPM, ["high", "performance"]));

        event = GLib.timeout_add_seconds(0, 5, Lang.bind(this, function () {
            this._updateIcon();
            return true;
        }));
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
                [res, pid] = GLib.spawn_async_with_pipes(null, [pkexec_path, dpmquery_path, "set", "default"].concat(settings),
                                                         null, GLib.SpawnFlags.SEARCH_PATH, null);
                GLib.spawn_close_pid(pid);
            }
        }
        GLib.spawn_close_pid(pid);
    },
};
