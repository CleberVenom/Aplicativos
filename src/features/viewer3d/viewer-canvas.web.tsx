import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import type { HostToViewer, ViewerToHost } from './protocol';
import { VIEWER_HTML } from './viewer-html.generated';

export type ViewerHandle = { send: (message: HostToViewer) => void };

type Props = {
  initial: HostToViewer;
  onMessage: (message: ViewerToHost) => void;
  style?: StyleProp<ViewStyle>;
};

/** Web: the same three.js page in a sandboxed iframe (scripts only, opaque origin). */
export const ViewerCanvas = forwardRef<ViewerHandle, Props>(function ViewerCanvas({ initial, onMessage, style }, ref) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [html] = useState(() => VIEWER_HTML.replace('<script>', `<script>window.__AMBIENTA_INITIAL__=${JSON.stringify(initial).replace(/</g, '\\u003c')};</script><script>`));

  useImperativeHandle(ref, () => ({
    send(message) {
      frame.current?.contentWindow?.postMessage(message, '*');
    },
  }));

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      const data = event.data as { source?: string; payload?: string } | null;
      if (data?.source !== 'ambienta-viewer' || typeof data.payload !== 'string') return;
      try {
        onMessage(JSON.parse(data.payload) as ViewerToHost);
      } catch {
        // ignore
      }
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [onMessage]);

  return (
    <View style={[{ flex: 1, overflow: 'hidden' }, style]}>
      <iframe
        ref={frame}
        title="Visualização 3D do ambiente"
        srcDoc={html}
        sandbox="allow-scripts"
        style={{ border: 0, width: '100%', height: '100%', display: 'block', background: '#EDE7DF' }}
      />
    </View>
  );
});
