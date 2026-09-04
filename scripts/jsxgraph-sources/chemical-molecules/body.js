// Define the visual appearance of the atoms
var atom_style = {
    size: 10,
    fillColor: 'white',
    strokeColor: 'none',
    label: {
        offset: [0, 0],
        anchorX: 'middle',
        anchorY: 'middle'
    }
};
// Define the visual appearance of the bonds
var bond_style = {
    color: 'black',
    strokeWidth: 1,
    highlight: false
};
var bond_dist = 4; // Distance between double or triple bond edges (in pixel)

// Create atoms
atom_style.name = 'C';
var A = board.create('point', [2, 2], atom_style);
atom_style.name = 'N';
var B = board.create('point', [2, 4], atom_style);
atom_style.name = 'H';
var C = board.create('point', [3, 1], atom_style);
atom_style.name = 'O';
var D = board.create('point', [1, 1], atom_style);

// Create bonds
// Single bond
var AC = board.create('segment', [A, C], bond_style);

// Double bond
var AD = board.create('segment', [A, D], bond_style);
var AD1 = createBond(AD, bond_dist, 1, bond_style);

// Triple bond
var AB = board.create('segment', [A, B], bond_style);
var AB1 = createBond(AB, bond_dist, 1, bond_style);
var AB2 = createBond(AB, bond_dist, -1, bond_style);
