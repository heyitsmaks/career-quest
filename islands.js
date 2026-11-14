import * as T from 'three';
import {addLandscape} from './alpine-terrain.js';
import {buildStations} from './alpine-stations.js';

export function createIslands(){
  const scene = new T.Scene();
  scene.background = new T.Color('#797c98');
  scene.fog = new T.FogExp2('#777d9a',.0066);
  const camera = new T.PerspectiveCamera(49,1,.09,340);
  const stations = [[-16,5],[1,-12],[22,-4],[29,18],[9,29],[-17,29]].map(([x,z])=>({x,z}));
  scene.add(new T.HemisphereLight('#ced9fd','#566171',1.68));
  const dusk = new T.DirectionalLight('#ffccaa',2.35);
  dusk.position.set(-26,28,16);scene.add(dusk);
  const rim = new T.DirectionalLight('#b4caff',1.05);
  rim.position.set(24,11,-27);scene.add(rim);
  const {terrain,waterMat,sky} = addLandscape(scene,stations);
  buildStations(scene,stations,terrain);
  return {scene,camera,stations,waterMat,sky};
}