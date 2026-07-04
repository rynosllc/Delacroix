// Screenshot feature deferred — requires react-native-view-shot native build.
// Will be re-enabled after next EAS build.
export function useScreenshot() {
  return { ref: null, capture: async () => {}, saving: false };
}
