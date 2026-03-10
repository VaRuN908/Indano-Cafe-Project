const btn = document.getElementById('btn');
const inp1 = document.getElementById('inp1');
const inp2 = document.getElementById('inp2');
const msg = document.getElementById('msg');

btn.addEventListener('click', function (event) {
    event.preventDefault();
    const val1 = inp1.value;
    const val2 = inp2.value;
    if (val1 === "" || val2 === "") {
        msg.innerText = "Please fill all the fields";
        msg.style.color = "red";
    }
    else if (val1.length < 3) {
        msg.innerText = "Username must be at least 3 characters long";
        msg.style.color = "orange";
    }
    else if (val2.length < 8) {
        msg.innerText = "Password must be at least 8 characters long";
        msg.style.color = "orange";
    }
    else {
        msg.innerText = "Form submitted successfully!";
        msg.style.color = "green";
    }
})