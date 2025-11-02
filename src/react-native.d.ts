// En la raíz de tu proyecto (mismo nivel que tsconfig.json)
// Archivo: react-native.d.ts

declare module "*.webp" {
  const content: any;
  export default content;
}

declare module "*.png" {
  const content: any;
  export default content;
}

declare module "*.jpg" {
  const content: any;
  export default content;
}
