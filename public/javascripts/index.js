/**
 * @author arunjitsingh
 */

$(document).ready(function() {
    
    if (!FI.APP) {
        alert("Application load failed in 'index.js'. Try reloading");
        throw "Application Load Error";
    }
    
    
    
    // NEVER DO THIS! DEBUGGING ONLY
    window.APP_INDEX = self;
});