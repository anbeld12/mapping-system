import MapView from "./map/MapView";
import { UIStateProvider } from "./context/UIStateContext";

function App() {
  return (
    <UIStateProvider>
      <MapView />
    </UIStateProvider>
  );
}

export default App;
