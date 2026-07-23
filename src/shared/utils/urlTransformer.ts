export const traverseAndTransform = (obj: any, direction: 'toFull' | 'toRelative', origin: string) => {
  if (obj === null || typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      traverseAndTransform(obj[i], direction, origin);
    }
  } else if (Object.getPrototypeOf(obj) === Object.prototype) {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (typeof val === 'string') {
          if (direction === 'toFull' && (val.startsWith('/uploads/') || val.startsWith('uploads/'))) {
            const path = val.startsWith('/') ? val : `/${val}`;
            obj[key] = `${origin}${path}`;
          } else if (direction === 'toRelative' && val.startsWith(`${origin}/uploads/`)) {
            obj[key] = val.replace(origin, '');
          }
        } else if (val !== null && typeof val === 'object') {
          traverseAndTransform(val, direction, origin);
        }
      }
    }
  }
};
