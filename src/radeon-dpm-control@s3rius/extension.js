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

        this.box = new St.BoxLayout({ style_class: 'popup-combobox-item' });

        this.icon = new St.Icon({ gicon: gicon, style_class: 'popup-menu-icon' });
        this.box.add(this.icon);

        this.label = new St.Label({ text: text });

        this.box.add(this.label);
        
        this.actor.add(this.box);
    },

    _onDestroy: function(){
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

        this._iconActor = new St.Icon({ icon_name: 'radeon-control-green',
                                        style_class: 'system-status-icon' });

        this.actor.add_actor(this._iconActor);
        this.actor.add_style_class_name('panel-status-button');

        this._display();

        Main.panel.addToStatusArea('radeon-dpm-control', this);
    },

    _updateIcon: function(){
        [res,pid,fdin,fdout,fderr] = GLib.spawn_async_with_pipes(null, ["/usr/bin/dpm-query", "get", "all"], null, GLib.SpawnFlags.SEARCH_PATH, null);
        let outstream = new Gio.UnixInputStream({fd:fdout,close_fd:true});
        let stdout = new Gio.DataInputStream({base_stream: outstream});

        let [out, size] = stdout.read_line(null);
        let [out2, size2] = stdout.read_line(null);

        if(out == null) {
             this._iconActor.icon_name = "radeon-control-error";
        }
        else {
            let result = out.toString() + out2.toString();
            
            if( result.search("low") != -1 && result.search("battery") != -1 ){
                this._iconActor.icon_name = "radeon-control-green";
            } else if( result.search("auto") != -1 && result.search("balanced") != -1 ) {
                this._iconActor.icon_name = "radeon-control-yellow";
            } else if( result.search("high") != -1 && result.search("\"performance\"") != -1 ) {
                this._iconActor.icon_name = "radeon-control-red";
            } else{ 
                this._iconActor.icon_name = "radeon-control-other";
            }
        }

    },

   _display: function()
   {
        this._updateIcon();

        let gicon = Gio.content_type_get_icon('radeon-control-green');
        let menuItem = new PopupIconMenuItem(gicon, " Set Low/Battery", {});
        this.menu.addMenuItem(menuItem);
        menuItem.connect('activate', Lang.bind(this, this._setDPM, 'low battery'));

        let gicon = Gio.content_type_get_icon('radeon-control-yellow');
        let menuItem = new PopupIconMenuItem(gicon, " Set Auto/Balanced", {});
        this.menu.addMenuItem(menuItem);
        menuItem.connect('activate', Lang.bind(this, this._setDPM, 'auto balanced'));

        let gicon = Gio.content_type_get_icon('radeon-control-red');
        let menuItem = new PopupIconMenuItem(gicon, " Set High/Performance", {});
        this.menu.addMenuItem(menuItem);
        menuItem.connect('activate', Lang.bind(this, this._setDPM, 'high performance'));

        event = GLib.timeout_add_seconds(0, 5, Lang.bind(this, function () {
            this._updateIcon();
            return true;
        }));


    },

    //This code was taken and modified from:
    //http://stackoverflow.com/questions/10099593/gnome-shell-privilege-escalation
    _setDPM: function(a,b,setting)
    {
        let pkexec_path = GLib.find_program_in_path('pkexec');
        let result = Util.trySpawnCommandLine(pkexec_path + " /usr/bin/dpm-query set all " + setting);
    },

};
