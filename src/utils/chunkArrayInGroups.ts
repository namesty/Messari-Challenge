export const chunkArrayInGroups = <T = unknown>(arr: T[], size: number) => {
  var myArray = [];
  for(var i = 0; i < arr.length; i += size) {
    myArray.push(arr.slice(i, i+size));
  }
  return myArray;
}