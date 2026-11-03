package ir.arattaexpo.staff;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Tells the portal what this build supports. Push needs a Firebase config
 * (google-services.json); asking Firebase for a token without one would crash.
 */
@CapacitorPlugin(name = "ArattaApp")
public class ArattaAppPlugin extends Plugin {

    @PluginMethod
    public void getInfo(PluginCall call) {
        int firebaseId = getContext().getResources().getIdentifier("google_app_id", "string", getContext().getPackageName());
        JSObject result = new JSObject();
        result.put("pushAvailable", firebaseId != 0);
        call.resolve(result);
    }
}
