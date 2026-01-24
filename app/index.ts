import { AppRegistry, Platform } from 'react-native';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
if (Platform.OS === 'web') {
    const rootTag = document.getElementById('root') || document.getElementById('main');
    AppRegistry.registerComponent('main', () => App);
    AppRegistry.runApplication('main', { rootTag });
} else {
    // Fallback for native
    const { registerRootComponent } = require('expo');
    registerRootComponent(App);
}
