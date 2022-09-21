// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

library Validator {
    function validateUsername(string memory username)
        internal
        pure
        returns (bool)
    {
        bytes memory usernameBytes = bytes(username);
        if (usernameBytes.length > 256 || usernameBytes.length < 4) {
            return false;
        }

        bool hasAlphaNumeric = false;

        for (uint256 i; i < usernameBytes.length; i++) {
            bytes1 char = usernameBytes[i];

            if (
                !(char >= 0x30 && char <= 0x39) && //9-0
                !(char >= 0x41 && char <= 0x5A) && //A-Z
                !(char >= 0x61 && char <= 0x7A) && //a-z
                char != 0x5F // _
            ) {
                return false;
            }

            if (char != 0x5F && !hasAlphaNumeric) {
                hasAlphaNumeric = true;
            }
        }

        return hasAlphaNumeric;
    }

    function validateMessage(string memory message)
        internal
        pure
        returns (bool)
    {
        return bytes(message).length > 0 && bytes(message).length <= 1024;
    }
}
