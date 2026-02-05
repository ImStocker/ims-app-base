import { defineConfigs } from 'v-network-graph';

export const getVNetworkConfig = (
  nodeRadius: number,
  nodeLabelFontSize: number,
) => {
  return defineConfigs({
    view: {
      autoPanAndZoomOnLoad: 'center-zero',
      scalingObjects: true,
    },
    node: {
      selectable: false,
      normal: {
        radius: nodeRadius,
        color: '#dddd00',
      },
      hover: {
        radius: nodeRadius + 3,
        color: '#bbbb00',
      },
      label: {
        directionAutoAdjustment: true,
        fontSize: nodeLabelFontSize,
      },
    },
    edge: {
      selectable: false,
      normal: {
        width: 3,
        color: '#000000',
        dasharray: '0',
        linecap: 'butt',
        animate: false,
      },
      hover: {
        width: 4,
        color: '#000000',
        dasharray: '0',
        linecap: 'butt',
        animate: false,
        animationSpeed: 50,
      },
      selected: {
        width: 3,
        color: '#dd8800',
        linecap: 'round',
        dasharray: 0,
        animate: false,
        animationSpeed: 50,
      },
      gap: 5,
      type: 'straight',
      margin: 0,
      marker: {
        source: {
          type: 'arrow',
          width: 4,
          height: 4,
          margin: 0,
          offset: 0,
          units: 'strokeWidth',
          color: null,
        },
        target: {
          type: 'none',
          width: 4,
          height: 4,
          margin: 0,
          offset: 0,
          units: 'strokeWidth',
          color: null,
        },
      },
    },
  });
};
