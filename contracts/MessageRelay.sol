// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./Validator.sol";

error MessageRelay__UsernameAlreadyExists();
error MessageRelay__AddressAlreadyRegistered();
error MessageRelay__InvalidUsername();
error MessageRelay__NoUser();
error MessageRelay__NoPublicKey();
error MessageRelay__NoMessage();
error MessageRelay__InvalidMessage();

contract MessageRelay {
    struct Message {
        string content;
        uint256 createdAt;
    }

    mapping(string => address) private usernameToAddress;
    mapping(address => string) private addressToUsername;
    mapping(string => string) private usernameToPublicKey;
    mapping(address => mapping(address => Message))
        private userAddressToMessage;

    function addUser(string memory username, string memory publicKey) public {
        if (!Validator.validateUsername(username)) {
            revert MessageRelay__InvalidUsername();
        }

        string memory addressUsername = addressToUsername[msg.sender];
        if (bytes(addressUsername).length != 0) {
            revert MessageRelay__AddressAlreadyRegistered();
        }

        address userAddress = usernameToAddress[username];
        if (userAddress != address(0x0)) {
            revert MessageRelay__UsernameAlreadyExists();
        }

        usernameToAddress[username] = msg.sender;
        addressToUsername[msg.sender] = username;
        usernameToPublicKey[username] = publicKey;
    }

    function changeUserPublicKey(string memory publicKey) public payable {
        string memory username = getUsername();
        usernameToPublicKey[username] = publicKey;
    }

    function getUsername() public view returns (string memory) {
        string memory username = addressToUsername[msg.sender];
        if (bytes(username).length == 0) {
            revert MessageRelay__NoUser();
        }
        return username;
    }

    function getUserAddress(string memory username)
        private
        view
        returns (address)
    {
        address userAddress = usernameToAddress[username];
        if (userAddress == address(0x0)) {
            revert MessageRelay__NoUser();
        }
        return userAddress;
    }

    function getPublicKey(string memory username)
        public
        view
        returns (string memory)
    {
        string memory publicKey = usernameToPublicKey[username];
        if (bytes(publicKey).length == 0) {
            revert MessageRelay__NoPublicKey();
        }
        return publicKey;
    }

    function sendMessage(string memory username, string memory content) public {
        if (!Validator.validateMessage(content)) {
            revert MessageRelay__InvalidMessage();
        }

        address receiverAddress = getUserAddress(username);
        userAddressToMessage[receiverAddress][msg.sender] = Message(
            content,
            block.timestamp * 1000
        );
    }

    function getMessage(string memory fromUsername)
        public
        view
        returns (Message memory)
    {
        address from = getUserAddress(fromUsername);
        Message memory message = userAddressToMessage[msg.sender][from];
        if (bytes(message.content).length == 0) {
            revert MessageRelay__NoMessage();
        }

        return message;
    }

    function deleteMessageFrom(string memory fromUsername) public payable {
        address from = getUserAddress(fromUsername);
        Message memory message = userAddressToMessage[msg.sender][from];
        if (bytes(message.content).length == 0) {
            revert MessageRelay__NoMessage();
        }
        delete userAddressToMessage[msg.sender][from];
    }

    function hasMessageFrom(string memory fromUsername)
        public
        view
        returns (bool)
    {
        address from = getUserAddress(fromUsername);
        Message memory message = userAddressToMessage[msg.sender][from];
        return bytes(message.content).length > 0;
    }

    function hasMessageTo(string memory toUsername) public view returns (bool) {
        address to = getUserAddress(toUsername);
        Message memory message = userAddressToMessage[to][msg.sender];
        return bytes(message.content).length > 0;
    }
}
