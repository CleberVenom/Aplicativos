import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';

import type { HostToViewer, ViewerToHost } from './protocol';
import { VIEWER_HTML } from './viewer-html.generated';

export type ViewerHandle = { send: (message: HostToViewer) => void };

type Props = {
  /** First scene, embedded in the page so it renders without a round trip. */
  initial: HostToViewer;
  onMessage: (message: ViewerToHost) => void;
  style?: StyleProp<ViewStyle>;
};

/** Native: the self-contained three.js page in a WebView (works in Expo Go, offline). */
export const ViewerCanvas = forwardRef<ViewerHandle, Props>(function ViewerCanvas({ initial, onMessage, style }, ref) {
  const webview = useRef<WebView>(null);
  // Built once: changing `source` would reload the page. Later updates go through `send`.
  const [html] = useState(() => VIEWER_HTML.replace('<script>', `<script>window.__AMBIENTA_INITIAL__=${JSON.stringify(initial).replace(/</g, '\\u003c')};</script><script>`));

  useImperativeHandle(ref, () => ({
    send(message) {
      const payload = JSON.stringify(message).replace(/</g, '\\u003c');
      webview.current?.injectJavaScript(`window.__AMBIENTA_VIEWER__&&window.__AMBIENTA_VIEWER__.receive(${payload});true;`);
    },
  }));

  return (
    <View style={[{ flex: 1, overflow: 'hidden' }, style]}>
      <WebView
        ref={webview}
        source={{ html }}
        originWhitelist={['*']}
        javaScriptEnabled
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        setSupportMultipleWindows={false}
        javaScriptCanOpenWindowsAutomatically={false}
        allowsInlineMediaPlayback={false}
        androidLayerType="hardware"
        style={{ flex: 1, backgroundColor: '#EDE7DF' }}
        onMessage={(event) => {
          try {
            onMessage(JSON.parse(event.nativeEvent.data) as ViewerToHost);
          } catch {
            // ignore malformed messages
          }
        }}
      />
    </View>
  );
});
