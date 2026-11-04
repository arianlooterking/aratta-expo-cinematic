package ir.arattaexpo.staff;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ArattaAppPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
